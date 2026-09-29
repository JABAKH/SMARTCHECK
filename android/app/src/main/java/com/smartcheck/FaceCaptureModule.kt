package com.smartcheck

import android.app.Activity
import android.content.Intent
import com.facebook.react.bridge.ActivityEventListener
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class FaceCaptureModule(private val reactContext: ReactApplicationContext) :
  ReactContextBaseJavaModule(reactContext), ActivityEventListener {

  private var pendingPromise: Promise? = null

  init {
    reactContext.addActivityEventListener(this)
  }

  override fun getName() = "FaceCapture"

  @ReactMethod
  fun capture(promise: Promise) {
    if (pendingPromise != null) {
      promise.reject("CAPTURE_IN_PROGRESS", "Ya hay una captura facial en curso.")
      return
    }

    val activity = currentActivity
    if (activity == null) {
      promise.reject("NO_ACTIVITY", "No se pudo abrir la cámara.")
      return
    }

    pendingPromise = promise
    activity.startActivityForResult(Intent(activity, FaceCaptureActivity::class.java), REQUEST_CAPTURE)
  }

  override fun onActivityResult(activity: Activity?, requestCode: Int, resultCode: Int, data: Intent?) {
    if (requestCode != REQUEST_CAPTURE) return

    val promise = pendingPromise ?: return
    pendingPromise = null
    val photo = data?.getStringExtra(FaceCaptureActivity.EXTRA_PHOTO_BASE64)

    when {
      resultCode == Activity.RESULT_OK && !photo.isNullOrBlank() -> promise.resolve(photo)
      resultCode == Activity.RESULT_CANCELED -> promise.reject(
        "CAPTURE_CANCELLED",
        data?.getStringExtra(FaceCaptureActivity.EXTRA_ERROR) ?: "La captura facial fue cancelada.",
      )
      else -> promise.reject(
        "CAPTURE_FAILED",
        data?.getStringExtra(FaceCaptureActivity.EXTRA_ERROR) ?: "No se pudo capturar el rostro.",
      )
    }
  }

  override fun onNewIntent(intent: Intent?) = Unit

  companion object {
    private const val REQUEST_CAPTURE = 4107
  }
}
