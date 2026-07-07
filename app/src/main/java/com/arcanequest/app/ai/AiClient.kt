package com.arcanequest.app.ai

import com.arcanequest.app.data.AiSettings
import kotlinx.serialization.json.Json
import kotlinx.serialization.json.buildJsonObject
import kotlinx.serialization.json.jsonArray
import kotlinx.serialization.json.jsonObject
import kotlinx.serialization.json.jsonPrimitive
import kotlinx.serialization.json.put
import kotlinx.serialization.json.putJsonArray
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

data class ChatMessage(val role: String, val content: String)

/**
 * Minimal client for any OpenAI-compatible chat completions endpoint
 * (Pollinations, DeepSeek, OpenRouter, Groq, etc).
 */
class AiClient(private val settings: AiSettings) {

    private val client = OkHttpClient.Builder()
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(180, TimeUnit.SECONDS)
        .writeTimeout(60, TimeUnit.SECONDS)
        .build()

    private val json = Json { ignoreUnknownKeys = true }

    /** Blocking call — invoke from a background dispatcher. Returns the assistant's text. */
    fun complete(messages: List<ChatMessage>): String {
        val body = buildJsonObject {
            put("model", settings.model)
            put("temperature", 0.9)
            putJsonArray("messages") {
                messages.forEach { m ->
                    add(buildJsonObject {
                        put("role", m.role)
                        put("content", m.content)
                    })
                }
            }
        }

        val builder = Request.Builder()
            .url(settings.endpoint)
            .header("Content-Type", "application/json")
            .post(body.toString().toRequestBody("application/json".toMediaType()))
        if (settings.apiKey.isNotBlank()) {
            builder.header("Authorization", "Bearer ${settings.apiKey}")
        }

        client.newCall(builder.build()).execute().use { resp ->
            val text = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) {
                throw IOException("AI request failed (HTTP ${resp.code}): ${text.take(300)}")
            }
            return extractContent(text)
        }
    }

    private fun extractContent(responseBody: String): String {
        return try {
            val root = json.parseToJsonElement(responseBody).jsonObject
            val choices = root["choices"]?.jsonArray
                ?: throw IOException("No choices in AI response")
            val first = choices.first().jsonObject
            val message = first["message"]?.jsonObject
                ?: throw IOException("No message in AI response")
            message["content"]?.jsonPrimitive?.content
                ?: throw IOException("No content in AI response")
        } catch (e: IOException) {
            throw e
        } catch (e: Exception) {
            // Some endpoints return plain text instead of a JSON envelope.
            if (responseBody.isNotBlank()) responseBody
            else throw IOException("Could not parse AI response: ${e.message}")
        }
    }
}
