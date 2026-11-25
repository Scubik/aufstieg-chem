package com.aufchem.aufstieg.ui.screens

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.OpenInNew
import androidx.compose.material.icons.rounded.ContentCopy
import androidx.compose.material.icons.rounded.Forum
import androidx.compose.material.icons.rounded.PersonOutline
import androidx.compose.material.icons.rounded.Public
import androidx.compose.material.icons.rounded.Science
import androidx.compose.material.icons.rounded.Send
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.SegmentedButton
import androidx.compose.material3.SegmentedButtonDefaults
import androidx.compose.material3.SingleChoiceSegmentedButtonRow
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.aufchem.aufstieg.data.AppThemeMode
import com.aufchem.aufstieg.data.ViewMode
import com.aufchem.aufstieg.ui.components.AufstiegChairLogo

@Composable
fun ContactsScreen(
    themeMode: AppThemeMode,
    adaptiveDarkDiagrams: Boolean,
    defaultViewMode: ViewMode,
    onThemeModeChange: (AppThemeMode) -> Unit,
    onAdaptiveDarkChange: (Boolean) -> Unit,
    onDefaultViewModeChange: (ViewMode) -> Unit,
    onShowMessage: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val context = LocalContext.current

    fun openUrl(url: String) {
        try {
            val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
            context.startActivity(intent)
        } catch (_: Exception) {
            onShowMessage("Не удалось открыть ссылку")
        }
    }

    fun copyText(text: String) {
        val cm = context.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("Aufstieg", text))
        onShowMessage("Скопировано: $text")
    }

    Column(
        modifier = modifier
            .fillMaxSize()
            .statusBarsPadding()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        Text(
            text = "Контакты и настройки",
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.onBackground,
        )

        // Hero Aufstieg brand card
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(22.dp))
                .background(
                    Brush.linearGradient(
                        colors = listOf(
                            Color(0xFF1E3A8A),
                            Color(0xFF2563EB),
                            Color(0xFF1D4ED8),
                        )
                    )
                )
                .padding(20.dp),
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Surface(
                    shape = RoundedCornerShape(16.dp),
                    color = Color.White.copy(alpha = 0.14f),
                    modifier = Modifier.size(64.dp),
                ) {
                    AufstiegChairLogo(
                        modifier = Modifier
                            .fillMaxSize()
                            .padding(10.dp),
                        strokeColor = Color.White,
                        flagColor = Color(0xFF93C5FD),
                    )
                }
                Text(
                    text = "Aufstieg | Химия",
                    style = MaterialTheme.typography.headlineSmall,
                    color = Color.White,
                )
            }
        }

        // Section: Our Resources
        SectionCard(title = "Наши ресурсы") {
            ContactRow(
                icon = Icons.Rounded.Send,
                title = "Telegram-канал",
                subtitle = "t.me/Aufchem",
                onClick = { openUrl("https://t.me/Aufchem") },
                onCopy = { copyText("https://t.me/Aufchem") },
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ContactRow(
                icon = Icons.Rounded.Forum,
                title = "Группа ВКонтакте",
                subtitle = "vk.ru/Aufchem",
                onClick = { openUrl("https://vk.ru/Aufchem") },
                onCopy = { copyText("https://vk.ru/Aufchem") },
            )
        }

        // Section: Support
        SectionCard(title = "Поддержка и обратная связь") {
            Text(
                text = "Нашли ошибку или есть идея для улучшения — напишите нам в Telegram:",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
            )
            ContactRow(
                icon = Icons.Rounded.PersonOutline,
                title = "@Eadweardik",
                subtitle = "t.me/Eadweardik",
                onClick = { openUrl("https://t.me/Eadweardik") },
                onCopy = { copyText("@Eadweardik") },
            )
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ContactRow(
                icon = Icons.Rounded.PersonOutline,
                title = "@yasher2027",
                subtitle = "t.me/yasher2027",
                onClick = { openUrl("https://t.me/yasher2027") },
                onCopy = { copyText("@yasher2027") },
            )
        }

        // Section: Original Resource Attribution
        SectionCard(title = "Оригинальный ресурс") {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    Icon(
                        Icons.Rounded.Science,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary,
                    )
                    Column {
                        Text(
                            text = "Chemistry By Design",
                            style = MaterialTheme.typography.titleMedium,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Text(
                            text = "Prof. Jon T. Njardarson Group · University of Arizona",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                }
                Text(
                    text = "База полных синтезов и реакционных схем основана на образовательном проекте Chemistry By Design Университета Аризоны.",
                    style = MaterialTheme.typography.bodyMedium,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
            }
            HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))
            ContactRow(
                icon = Icons.Rounded.Public,
                title = "Открыть Chemistry By Design",
                subtitle = "chemistrybydesign.oia.arizona.edu",
                onClick = { openUrl("https://chemistrybydesign.oia.arizona.edu/") },
                onCopy = { copyText("https://chemistrybydesign.oia.arizona.edu/") },
            )
        }

        // Section: Appearance & Preferences
        SectionCard(title = "Оформление и настройки") {
            Column(
                modifier = Modifier.padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(14.dp),
            ) {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Тема приложения",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                        val options = listOf(
                            AppThemeMode.SYSTEM to "Система",
                            AppThemeMode.LIGHT to "Светлая",
                            AppThemeMode.DARK to "Тёмная",
                        )
                        options.forEachIndexed { idx, (mode, label) ->
                            SegmentedButton(
                                selected = themeMode == mode,
                                onClick = { onThemeModeChange(mode) },
                                shape = SegmentedButtonDefaults.itemShape(idx, options.size, RoundedCornerShape(10.dp)),
                                label = { Text(label, maxLines = 1) },
                            )
                        }
                    }
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                        Text(
                            text = "Тёмный стиль формул",
                            style = MaterialTheme.typography.titleSmall,
                            color = MaterialTheme.colorScheme.onSurface,
                        )
                        Text(
                            text = "В тёмной теме рисовать светлые формулы на тёмных карточках (выкл. — белая бумага)",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                    }
                    Switch(
                        checked = adaptiveDarkDiagrams,
                        onCheckedChange = onAdaptiveDarkChange,
                    )
                }

                HorizontalDivider(color = MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.5f))

                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    Text(
                        text = "Режим открытия синтеза",
                        style = MaterialTheme.typography.titleSmall,
                        color = MaterialTheme.colorScheme.onSurface,
                    )
                    SingleChoiceSegmentedButtonRow(modifier = Modifier.fillMaxWidth()) {
                        val modes = listOf(
                            ViewMode.FEED to "Лента",
                            ViewMode.CANVAS to "Схема",
                        )
                        modes.forEachIndexed { idx, (m, label) ->
                            SegmentedButton(
                                selected = defaultViewMode == m,
                                onClick = { onDefaultViewModeChange(m) },
                                shape = SegmentedButtonDefaults.itemShape(idx, modes.size, RoundedCornerShape(10.dp)),
                                label = { Text(label, maxLines = 1) },
                            )
                        }
                    }
                }
            }
        }

        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun SectionCard(
    title: String,
    content: @Composable () -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
            color = MaterialTheme.colorScheme.primary,
            modifier = Modifier.padding(start = 4.dp),
        )
        Surface(
            shape = RoundedCornerShape(18.dp),
            color = MaterialTheme.colorScheme.surface,
            border = BorderStroke(1.dp, MaterialTheme.colorScheme.outlineVariant.copy(alpha = 0.7f)),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Column(modifier = Modifier.fillMaxWidth()) {
                content()
            }
        }
    }
}

@Composable
private fun ContactRow(
    icon: ImageVector,
    title: String,
    subtitle: String,
    onClick: () -> Unit,
    onCopy: () -> Unit,
    showOpenIcon: Boolean = true,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick)
            .padding(start = 16.dp, end = 6.dp, top = 12.dp, bottom = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            imageVector = icon,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.primary,
            modifier = Modifier.size(22.dp),
        )
        Spacer(Modifier.width(14.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall,
                color = MaterialTheme.colorScheme.onSurface,
            )
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        IconButton(onClick = onCopy) {
            Icon(
                Icons.Rounded.ContentCopy,
                contentDescription = "Скопировать",
                tint = MaterialTheme.colorScheme.onSurfaceVariant,
                modifier = Modifier.size(19.dp),
            )
        }
        if (showOpenIcon) {
            Icon(
                Icons.AutoMirrored.Rounded.OpenInNew,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.onSurfaceVariant.copy(alpha = 0.7f),
                modifier = Modifier
                    .padding(end = 10.dp)
                    .size(18.dp),
            )
        }
    }
}
