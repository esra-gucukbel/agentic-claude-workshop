package com.vibeplanner

import com.vibeplanner.plugins.configureAuthentication
import com.vibeplanner.plugins.configureRouting
import com.vibeplanner.plugins.configureSerialization
import com.vibeplanner.plugins.dataSource
import com.zaxxer.hikari.HikariConfig
import com.zaxxer.hikari.HikariDataSource
import io.ktor.server.config.*
import io.ktor.server.testing.*
import org.junit.jupiter.api.BeforeAll
import org.testcontainers.containers.PostgreSQLContainer
import org.testcontainers.junit.jupiter.Container
import org.testcontainers.junit.jupiter.Testcontainers

@Testcontainers
abstract class BaseRouteTest {

    companion object {
        @Container
        @JvmStatic
        val postgres: PostgreSQLContainer<*> = PostgreSQLContainer("postgres:16-alpine")
            .withInitScript("test-seed.sql")

        @JvmStatic
        @BeforeAll
        fun setupDataSource() {
            val config = HikariConfig().apply {
                jdbcUrl = postgres.jdbcUrl
                username = postgres.username
                password = postgres.password
                maximumPoolSize = 5
                isAutoCommit = false
            }
            dataSource = HikariDataSource(config)
        }
    }

    fun withTestApp(block: suspend ApplicationTestBuilder.() -> Unit) = testApplication {
        environment {
            config = MapApplicationConfig(
                "jwt.secret" to "test-secret-key",
                "jwt.issuer" to "vibe-planner",
                "jwt.audience" to "vibe-planner-users",
                "jwt.realm" to "vibe-planner"
            )
        }
        application {
            configureSerialization()
            configureAuthentication()
            configureRouting()
        }
        block()
    }
}
