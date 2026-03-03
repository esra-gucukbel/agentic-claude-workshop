package com.vibeplanner

import com.vibeplanner.plugins.configureAuthentication
import com.vibeplanner.plugins.configureDatabase
import com.vibeplanner.plugins.configureRouting
import com.vibeplanner.plugins.configureSerialization
import io.ktor.server.application.*
import io.ktor.server.netty.*

// EngineMain loads application.conf from classpath and performs HOCON env var substitution
fun main(args: Array<String>): Unit = EngineMain.main(args)

fun Application.module() {
    configureSerialization()
    configureDatabase()
    configureAuthentication()
    configureRouting()
}
