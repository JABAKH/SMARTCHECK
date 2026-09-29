package com.smartcheck

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Color
import android.graphics.Matrix
import android.os.Bundle
import android.util.Base64
import android.view.Gravity
import android.view.ViewGroup
import android.widget.FrameLayout
import android.widget.TextView
import androidx.activity.ComponentActivity
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageAnalysis
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.core.content.ContextCompat
import androidx.exifinterface.media.ExifInterface
import com.google.mlkit.vision.common.InputImage
import com.google.mlkit.vision.face.FaceDetection
import com.google.mlkit.vision.face.FaceDetector
import com.google.mlkit.vision.face.FaceDetectorOptions
import java.io.File
import java.io.ByteArrayOutputStream
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

/** Captura una sola selfie cuando ML Kit detecta un rostro en la cámara frontal. */
class FaceCaptureActivity : ComponentActivity() {
  private lateinit var cameraExecutor: ExecutorService
  private lateinit var imageCapture: ImageCapture
  private lateinit var detector: FaceDetector
  private lateinit var instructions: TextView
  private var captureStarted = false
  private var previewReadyAt = 0L
  private var consecutiveFaceFrames = 0
  private var captureAttempts = 0

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
      finishWithError("Se requiere permiso de cámara para la captura facial.")
      return
    }

    val root = FrameLayout(this)
    val previewView = PreviewView(this).apply {
      scaleType = PreviewView.ScaleType.FILL_CENTER
    }
    root.addView(previewView, FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.MATCH_PARENT,
    ))
    instructions = TextView(this).apply {
      text = "Coloca tu rostro dentro del recuadro\\nLa foto se tomará automáticamente"
      setTextColor(Color.WHITE)
      textSize = 18f
      gravity = Gravity.CENTER
      setPadding(36, 24, 36, 24)
      setBackgroundColor(Color.argb(170, 6, 16, 28))
    }
    root.addView(instructions, FrameLayout.LayoutParams(
      ViewGroup.LayoutParams.MATCH_PARENT,
      ViewGroup.LayoutParams.WRAP_CONTENT,
      Gravity.BOTTOM,
    ))
    setContentView(root)

    cameraExecutor = Executors.newSingleThreadExecutor()
    detector = FaceDetection.getClient(
      FaceDetectorOptions.Builder()
        .setPerformanceMode(FaceDetectorOptions.PERFORMANCE_MODE_FAST)
        .setLandmarkMode(FaceDetectorOptions.LANDMARK_MODE_NONE)
        .setClassificationMode(FaceDetectorOptions.CLASSIFICATION_MODE_NONE)
        .build(),
    )
    startCamera(previewView)
  }

  private fun startCamera(previewView: PreviewView) {
    val providerFuture = ProcessCameraProvider.getInstance(this)
    providerFuture.addListener({
      try {
        val provider = providerFuture.get()
        val preview = Preview.Builder().build().also {
          it.surfaceProvider = previewView.surfaceProvider
        }
        imageCapture = ImageCapture.Builder()
          .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
          .setJpegQuality(82)
          .build()
        val analysis = ImageAnalysis.Builder()
          .setBackpressureStrategy(ImageAnalysis.STRATEGY_KEEP_ONLY_LATEST)
          .build()

        analysis.setAnalyzer(cameraExecutor) { proxy ->
          val mediaImage = proxy.image
          if (mediaImage == null || captureStarted) {
            proxy.close()
            return@setAnalyzer
          }

          val image = InputImage.fromMediaImage(mediaImage, proxy.imageInfo.rotationDegrees)
          detector.process(image)
            .addOnSuccessListener { faces ->
              if (faces.isNotEmpty() && !captureStarted) {
                consecutiveFaceFrames += 1
                if (
                  System.currentTimeMillis() - previewReadyAt >= MINIMUM_PREVIEW_MS &&
                  consecutiveFaceFrames >= STABLE_FACE_FRAMES
                ) {
                  captureStarted = true
                  captureSelfie()
                }
              } else {
                consecutiveFaceFrames = 0
              }
            }
            .addOnCompleteListener { proxy.close() }
        }

        provider.unbindAll()
        provider.bindToLifecycle(this, CameraSelector.DEFAULT_FRONT_CAMERA, preview, imageCapture, analysis)
        previewReadyAt = System.currentTimeMillis()
      } catch (_: Exception) {
        finishWithError("No se pudo iniciar la cámara frontal.")
      }
    }, ContextCompat.getMainExecutor(this))
  }

  private fun captureSelfie() {
    val photoFile = try {
      File.createTempFile("smartcheck-face-", ".jpg", cacheDir)
    } catch (_: Exception) {
      retryOrFinish("No se pudo preparar la camara para tomar la foto.")
      return
    }
    val output = ImageCapture.OutputFileOptions.Builder(photoFile).build()
    imageCapture.takePicture(output, ContextCompat.getMainExecutor(this), object : ImageCapture.OnImageSavedCallback {
      override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
        try {
          val photo = "data:image/jpeg;base64," + Base64.encodeToString(encodePhotoForTransfer(photoFile), Base64.NO_WRAP)
          setResult(Activity.RESULT_OK, Intent().putExtra(EXTRA_PHOTO_BASE64, photo))
          finish()
        } catch (_: Exception) {
          finishWithError("No se pudo preparar la foto de acceso.")
        } finally {
          photoFile.delete()
        }
      }

      override fun onError(exception: ImageCaptureException) {
        if (captureAttempts + 1 < MAX_CAPTURE_ATTEMPTS) {
          photoFile.delete()
          retryOrFinish("La camara esta ajustando el enfoque. Manten tu rostro centrado.")
          return
        }
        finishWithError("No se pudo tomar la foto automáticamente.")
      }
    })
  }

  private fun retryOrFinish(message: String) {
    captureAttempts += 1
    if (captureAttempts >= MAX_CAPTURE_ATTEMPTS) {
      finishWithError(message)
      return
    }
    captureStarted = false
    consecutiveFaceFrames = 0
  }

  /**
   * Una foto de cÃ¡mara completa puede superar el lÃ­mite de resultados entre
   * actividades de Android. La pantalla TV requiere una miniatura, asÃ­ que se
   * limita a 720 px y se comprime antes de enviarla al puente de React Native.
   */
  private fun encodePhotoForTransfer(photoFile: File): ByteArray {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeFile(photoFile.absolutePath, bounds)
    var sampleSize = 1
    while (bounds.outWidth / sampleSize > MAX_IMAGE_SIDE * 2 || bounds.outHeight / sampleSize > MAX_IMAGE_SIDE * 2) {
      sampleSize *= 2
    }
    val options = BitmapFactory.Options().apply { inSampleSize = sampleSize }
    val decoded = BitmapFactory.decodeFile(photoFile.absolutePath, options)
      ?: throw IllegalStateException("No se pudo leer la foto capturada.")
    val largestSide = maxOf(decoded.width, decoded.height)
    val scaledBitmap = if (largestSide > MAX_IMAGE_SIDE) {
      val scale = MAX_IMAGE_SIDE.toFloat() / largestSide
      Bitmap.createScaledBitmap(decoded, (decoded.width * scale).toInt(), (decoded.height * scale).toInt(), true)
        .also { if (it !== decoded) decoded.recycle() }
    } else {
      decoded
    }
    val orientation = ExifInterface(photoFile.absolutePath).getAttributeInt(
      ExifInterface.TAG_ORIENTATION,
      ExifInterface.ORIENTATION_NORMAL,
    )
    val rotation = when (orientation) {
      ExifInterface.ORIENTATION_ROTATE_90 -> 90f
      ExifInterface.ORIENTATION_ROTATE_180 -> 180f
      ExifInterface.ORIENTATION_ROTATE_270 -> 270f
      else -> 0f
    }
    val bitmap = if (rotation != 0f) {
      Bitmap.createBitmap(
        scaledBitmap,
        0,
        0,
        scaledBitmap.width,
        scaledBitmap.height,
        Matrix().apply { postRotate(rotation) },
        true,
      ).also { if (it !== scaledBitmap) scaledBitmap.recycle() }
    } else {
      scaledBitmap
    }
    return try {
      ByteArrayOutputStream().use { output ->
        bitmap.compress(Bitmap.CompressFormat.JPEG, JPEG_QUALITY, output)
        output.toByteArray()
      }
    } finally {
      bitmap.recycle()
    }
  }

  private fun finishWithError(message: String) {
    setResult(Activity.RESULT_CANCELED, Intent().putExtra(EXTRA_ERROR, message))
    finish()
  }

  override fun onDestroy() {
    if (::cameraExecutor.isInitialized) cameraExecutor.shutdown()
    if (::detector.isInitialized) detector.close()
    super.onDestroy()
  }

  companion object {
    private const val MINIMUM_PREVIEW_MS = 1200L
    private const val STABLE_FACE_FRAMES = 4
    private const val MAX_CAPTURE_ATTEMPTS = 3
    private const val MAX_IMAGE_SIDE = 720
    private const val JPEG_QUALITY = 65
    const val EXTRA_PHOTO_BASE64 = "photoBase64"
    const val EXTRA_ERROR = "error"
  }
}
