package com.arcanequest.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.NavType
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import androidx.navigation.navArgument
import com.arcanequest.app.game.GameViewModel
import com.arcanequest.app.ui.screens.GameScreen
import com.arcanequest.app.ui.screens.MainMenuScreen
import com.arcanequest.app.ui.screens.SettingsScreen
import com.arcanequest.app.ui.screens.SetupScreen
import com.arcanequest.app.ui.theme.ArcaneQuestTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            ArcaneQuestTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = MaterialTheme.colorScheme.background,
                ) {
                    AppNav()
                }
            }
        }
    }
}

@androidx.compose.runtime.Composable
private fun AppNav() {
    val nav = rememberNavController()
    val gameViewModel: GameViewModel = viewModel()

    NavHost(navController = nav, startDestination = "menu") {
        composable("menu") {
            MainMenuScreen(
                onOpenSlot = { slot, isEmpty ->
                    if (isEmpty) nav.navigate("setup/$slot")
                    else nav.navigate("game/$slot")
                },
                onOpenSettings = { nav.navigate("settings") },
            )
        }
        composable(
            "setup/{slot}",
            arguments = listOf(navArgument("slot") { type = NavType.IntType }),
        ) { entry ->
            val slot = entry.arguments?.getInt("slot") ?: 1
            SetupScreen(
                slot = slot,
                onBegin = { setup, character ->
                    gameViewModel.startNewCampaign(slot, setup, character)
                    nav.navigate("game/$slot") {
                        popUpTo("menu")
                    }
                },
                onBack = { nav.popBackStack() },
            )
        }
        composable(
            "game/{slot}",
            arguments = listOf(navArgument("slot") { type = NavType.IntType }),
        ) { entry ->
            val slot = entry.arguments?.getInt("slot") ?: 1
            GameScreen(
                slot = slot,
                viewModel = gameViewModel,
                onExit = { nav.popBackStack("menu", inclusive = false) },
            )
        }
        composable("settings") {
            SettingsScreen(onBack = { nav.popBackStack() })
        }
    }
}
