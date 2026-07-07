package com.arcanequest.app.data

import android.content.Context

data class AiSettings(
    val endpoint: String,
    val apiKey: String,
    val model: String,
)

data class AiPreset(
    val label: String,
    val endpoint: String,
    val model: String,
    val needsKey: Boolean,
    val note: String,
)

class SettingsRepository(context: Context) {

    companion object {
        val PRESETS = listOf(
            AiPreset(
                label = "Pollinations (free, no key needed)",
                endpoint = "https://text.pollinations.ai/openai",
                model = "openai",
                needsKey = false,
                note = "Works out of the box. No account or API key required.",
            ),
            AiPreset(
                label = "DeepSeek",
                endpoint = "https://api.deepseek.com/chat/completions",
                model = "deepseek-chat",
                needsKey = true,
                note = "Very cheap. Get a key at platform.deepseek.com.",
            ),
            AiPreset(
                label = "OpenRouter — Nemotron 3 Ultra (most powerful free)",
                endpoint = "https://openrouter.ai/api/v1/chat/completions",
                model = "nvidia/nemotron-3-ultra-550b-a55b:free",
                needsKey = true,
                note = "Strongest free model (550B MoE). Needs a free API key from openrouter.ai. " +
                    "If it's rate-limited, try openai/gpt-oss-120b:free in the model field.",
            ),
            AiPreset(
                label = "Groq (free tier)",
                endpoint = "https://api.groq.com/openai/v1/chat/completions",
                model = "llama-3.3-70b-versatile",
                needsKey = true,
                note = "Fast free tier. Get a key at console.groq.com.",
            ),
        )
        val DEFAULT = PRESETS[0]
    }

    private val prefs = context.getSharedPreferences("ai_settings", Context.MODE_PRIVATE)

    fun get(): AiSettings = AiSettings(
        endpoint = prefs.getString("endpoint", DEFAULT.endpoint) ?: DEFAULT.endpoint,
        apiKey = prefs.getString("apiKey", "") ?: "",
        model = prefs.getString("model", DEFAULT.model) ?: DEFAULT.model,
    )

    fun set(settings: AiSettings) {
        prefs.edit()
            .putString("endpoint", settings.endpoint.trim())
            .putString("apiKey", settings.apiKey.trim())
            .putString("model", settings.model.trim())
            .apply()
    }

    /** AI-generated scene artwork behind the story text (Pollinations image API, free). */
    fun sceneArtEnabled(): Boolean = prefs.getBoolean("sceneArt", true)

    fun setSceneArtEnabled(enabled: Boolean) {
        prefs.edit().putBoolean("sceneArt", enabled).apply()
    }
}
