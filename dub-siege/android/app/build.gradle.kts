plugins {
    id("com.android.application")
}

android {
    namespace = "online.kuboplay.dubsiege"
    compileSdk = 34

    defaultConfig {
        applicationId = "online.kuboplay.dubsiege"
        minSdk = 24
        targetSdk = 34
        versionCode = (System.getenv("GITHUB_RUN_NUMBER") ?: "1").toInt()
        versionName = "1.0." + (System.getenv("GITHUB_RUN_NUMBER") ?: "0")
    }

    // Clave fija del repositorio: cada APK nuevo se instala encima del anterior
    // sin perder la partida guardada. Para Google Play haria falta una clave privada.
    signingConfigs {
        create("kuboplay") {
            storeFile = file("kuboplay.keystore")
            storePassword = "kuboplay"
            keyAlias = "kuboplay"
            keyPassword = "kuboplay"
        }
    }
    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            signingConfig = signingConfigs.getByName("kuboplay")
        }
        getByName("debug") {
            signingConfig = signingConfigs.getByName("kuboplay")
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

// El juego se copia en assets al compilar: la unica fuente es dub-siege.html.
val webAppSource = rootProject.file("../dub-siege.html")
val syncWebApp by tasks.registering(Copy::class) {
    onlyIf { webAppSource.exists() }
    from(webAppSource) { rename { "index.html" } }
    into(layout.projectDirectory.dir("src/main/assets"))
}
tasks.named("preBuild") { dependsOn(syncWebApp) }
