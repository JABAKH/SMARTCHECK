if(NOT TARGET hermes-engine::libhermes)
add_library(hermes-engine::libhermes SHARED IMPORTED)
set_target_properties(hermes-engine::libhermes PROPERTIES
    IMPORTED_LOCATION "C:/Users/G16/.gradle/caches/8.10.2/transforms/b0a8e7dcb834e463fb86d50fe79b06bb/transformed/hermes-android-0.76.7-debug/prefab/modules/libhermes/libs/android.armeabi-v7a/libhermes.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/G16/.gradle/caches/8.10.2/transforms/b0a8e7dcb834e463fb86d50fe79b06bb/transformed/hermes-android-0.76.7-debug/prefab/modules/libhermes/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

