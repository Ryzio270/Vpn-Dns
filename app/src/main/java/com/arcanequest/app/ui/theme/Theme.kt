package com.arcanequest.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp
import com.arcanequest.app.R

// Dark-fantasy palette
val Parchment = Color(0xFFE8DCC0)
val ParchmentDim = Color(0xFFB8AD94)
val Gold = Color(0xFFE8C36A)
val GoldDark = Color(0xFFB8934A)
val DeepInk = Color(0xFF0F0C18)
val Panel = Color(0xFF1B1526)
val PanelLight = Color(0xFF262033)
val BloodRed = Color(0xFFC75450)
val ForestGreen = Color(0xFF7BA05B)
val MysticPurple = Color(0xFF9B7EC8)

val RarityCommon = Color(0xFFB8AD94)
val RarityUncommon = Color(0xFF7BA05B)
val RarityRare = Color(0xFF5B9BD5)
val RarityEpic = Color(0xFF9B7EC8)
val RarityLegendary = Color(0xFFE8A33D)

fun rarityColor(rarity: String): Color = when (rarity.lowercase()) {
    "uncommon" -> RarityUncommon
    "rare" -> RarityRare
    "epic" -> RarityEpic
    "legendary" -> RarityLegendary
    else -> RarityCommon
}

/**
 * In-game accent color, set per campaign from its vibe. Screens outside a
 * campaign (menu, setup, settings) keep the default gold.
 */
val LocalAccent = staticCompositionLocalOf { Gold }

fun vibeAccent(vibe: String): Color {
    val v = vibe.lowercase()
    return when {
        "grimdark" in v -> Color(0xFFC25B4E)      // ash red
        "horror" in v -> Color(0xFFB84040)        // blood red
        "mystery" in v -> Color(0xFFA98BD6)       // violet
        "intrigue" in v -> Color(0xFFC3C9DB)      // court silver
        "comedy" in v -> Color(0xFFF2A65A)        // warm orange
        "exploration" in v -> Color(0xFF8FBF6F)   // trail green
        "war" in v -> Color(0xFFD98E5F)           // burnished bronze
        "slice of life" in v -> Color(0xFF8FCFC0) // soft teal
        "heist" in v -> Color(0xFF5FC0AB)         // teal-gold
        else -> Gold                               // heroic default
    }
}

/** Display serif for titles and headers. */
val Cinzel = FontFamily(Font(R.font.cinzel))

/** Readable book serif for narration and body text. */
val Alegreya = FontFamily(Font(R.font.alegreya))

private val DarkScheme = darkColorScheme(
    primary = Gold,
    onPrimary = DeepInk,
    secondary = MysticPurple,
    onSecondary = DeepInk,
    tertiary = ForestGreen,
    background = DeepInk,
    onBackground = Parchment,
    surface = Panel,
    onSurface = Parchment,
    surfaceVariant = PanelLight,
    onSurfaceVariant = ParchmentDim,
    error = BloodRed,
    onError = DeepInk,
    outline = GoldDark,
)

private val AppTypography = Typography(
    headlineLarge = TextStyle(
        fontFamily = Cinzel,
        fontWeight = FontWeight.Bold,
        fontSize = 30.sp,
        letterSpacing = 2.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = Cinzel,
        fontWeight = FontWeight.Bold,
        fontSize = 23.sp,
        letterSpacing = 1.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = Cinzel,
        fontWeight = FontWeight.Bold,
        fontSize = 19.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = Cinzel,
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = Alegreya,
        fontSize = 18.sp,
        lineHeight = 27.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = Alegreya,
        fontSize = 15.sp,
        lineHeight = 21.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = Cinzel,
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
        letterSpacing = 1.5.sp,
    ),
)

@Composable
fun ArcaneQuestTheme(content: @Composable () -> Unit) {
    // Always dark — it's a dungeon, after all.
    isSystemInDarkTheme()
    MaterialTheme(
        colorScheme = DarkScheme,
        typography = AppTypography,
        content = content,
    )
}
