import com.android.build.gradle.internal.api.BaseVariantOutputImpl

// Release tags are also the Android update version source. This keeps versionCode
// strictly increasing for normal semver releases (vMAJOR.MINOR.PATCH).
val releaseTagForBuild = project.findProperty("releaseTag")?.toString() ?: "v0.0.0"
val semverMatch = Regex("^v?(\\d+)\\.(\\d+)\\.(\\d+)(?:[-+].*)?$").find(releaseTagForBuild)
val releaseVersionCode = semverMatch?.let {
    val major = it.groupValues[1].toLongOrNull() ?: 0L
    val minor = it.groupValues[2].toLongOrNull() ?: 0L
    val patch = it.groupValues[3].toLongOrNull() ?: 0L
    (major * 1_000_000L + minor * 1_000L + patch).coerceAtMost(2_100_000_000L).toInt()
} ?: 1

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.betterdeepseek.app"
    compileSdk = 34

    buildFeatures {
        buildConfig = true
    }

    defaultConfig {
        applicationId = "com.betterdeepseek.app"
        minSdk = 26
        targetSdk = 34
        versionCode = releaseVersionCode
        // Keep in sync with the release tag used by GitHub Actions.
        versionName = releaseTagForBuild.removePrefix("v")
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    // IMPORTANT: release builds must ALWAYS use the same long-lived keystore.
    // Falling back to the ephemeral GitHub Actions debug keystore makes every
    // release have a different signing certificate and breaks Android updates.
    signingConfigs {
        create("release") {
            storeFile = rootProject.file("ci-release.jks")
            storePassword = System.getenv("BDS_KEYSTORE_PASSWORD") ?: ""
            keyAlias = System.getenv("BDS_KEY_ALIAS") ?: ""
            keyPassword = System.getenv("BDS_KEY_PASSWORD") ?: ""
        }
    }

    buildTypes {
        debug {
            isMinifyEnabled = false
        }
        release {
            // Never silently produce a debug-signed release APK.
            // CI validates that the keystore and all credentials exist before Gradle.
            signingConfig = signingConfigs.getByName("release")
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    packaging {
        resources {
            excludes += setOf("META-INF/AL2.0", "META-INF/LGPL2.1")
        }
    }

    testOptions {
        unitTests {
            isReturnDefaultValues = true
            isIncludeAndroidResources = true
        }
    }

    splits {
        abi {
            isEnable = true
            reset()
            include("arm64-v8a", "armeabi-v7a", "x86_64")
            isUniversalApk = false
        }
    }

    applicationVariants.all {
        outputs.all {
            val outputImpl = this as BaseVariantOutputImpl
            val abi = outputImpl.filters.firstOrNull { it.filterType == com.android.build.VariantOutput.ABI }?.identifier ?: "universal"
            outputImpl.outputFileName = "BetterDeepSeek-${releaseTagForBuild}-${abi}.apk"
        }
    }
}

dependencies {
    implementation("androidx.core:core-ktx:1.13.1")
    implementation("androidx.appcompat:appcompat:1.7.0")
    implementation("androidx.activity:activity-ktx:1.9.2")
    implementation("androidx.webkit:webkit:1.11.0")
    implementation("androidx.documentfile:documentfile:1.0.1")

    implementation("com.google.android.material:material:1.12.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    testImplementation("junit:junit:4.13.2")
    testImplementation("org.mockito:mockito-core:5.12.0")
    testImplementation("org.mockito.kotlin:mockito-kotlin:5.4.0")
    testImplementation("com.squareup.okhttp3:mockwebserver:4.12.0")
    testImplementation("org.json:json:20240303")
    testImplementation("org.robolectric:robolectric:4.13")

    androidTestImplementation("androidx.test.ext:junit-ktx:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.test:rules:1.6.1")
    androidTestImplementation("androidx.test:runner:1.6.2")
}
