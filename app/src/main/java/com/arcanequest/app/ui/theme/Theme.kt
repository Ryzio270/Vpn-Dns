package com.arcanequest.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

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
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Bold,
        fontSize = 32.sp,
        letterSpacing = 1.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Bold,
        fontSize = 24.sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.Bold,
        fontSize = 20.sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.Serif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 17.sp,
    ),
    bodyLarge = TextStyle(
        fontFamily = FontFamily.Serif,
        fontSize = 17.sp,
        lineHeight = 26.sp,
    ),
    bodyMedium = TextStyle(
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    labelLarge = TextStyle(
        fontWeight = FontWeight.SemiBold,
        fontSize = 14.sp,
        letterSpacing = 0.5.sp,
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
