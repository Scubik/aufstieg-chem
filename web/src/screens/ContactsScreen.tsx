import React from 'react';
import {
  Copy,
  ExternalLink,
  FlaskConical,
  Globe,
  MessageSquare,
  Send,
  User,
} from 'lucide-react';
import type { AppThemeMode, ViewMode } from '../types/models';
import { AufstiegChairLogo } from '../components/AufstiegLogo';
import { openExternalUrl } from '../utils/telegram';

interface ContactsScreenProps {
  themeMode: AppThemeMode;
  adaptiveDark: boolean;
  defaultViewMode: ViewMode;
  onThemeModeChange: (m: AppThemeMode) => void;
  onAdaptiveDarkChange: (v: boolean) => void;
  onDefaultViewModeChange: (v: ViewMode) => void;
  onShowMessage: (msg: string) => void;
}

export const ContactsScreen: React.FC<ContactsScreenProps> = ({
  themeMode,
  adaptiveDark,
  defaultViewMode,
  onThemeModeChange,
  onAdaptiveDarkChange,
  onDefaultViewModeChange,
  onShowMessage,
}) => {
  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      onShowMessage(`Скопировано: ${text}`);
    } catch {
      onShowMessage(text);
    }
  };

  return (
    <div className="page-scroll">
      <div className="contacts-wrap">
        <h1 className="page-title">Контакты и настройки</h1>

        <div className="hero-card">
          <div className="hero-logo-box">
            <AufstiegChairLogo strokeColor="#FFFFFF" flagColor="#93C5FD" />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700 }}>Aufstieg | Химия</div>
        </div>

        <div>
          <div className="section-title">Наши ресурсы</div>
          <div className="section-card">
            <ContactRow
              icon={<Send size={20} color="var(--primary)" />}
              title="Telegram-канал"
              subtitle="t.me/Aufchem"
              onClick={() => openExternalUrl('https://t.me/Aufchem')}
              onCopy={() => copyText('https://t.me/Aufchem')}
            />
            <div className="divider" />
            <ContactRow
              icon={<MessageSquare size={20} color="var(--primary)" />}
              title="Группа ВКонтакте"
              subtitle="vk.ru/Aufchem"
              onClick={() => openExternalUrl('https://vk.ru/Aufchem')}
              onCopy={() => copyText('https://vk.ru/Aufchem')}
            />
          </div>
        </div>

        <div>
          <div className="section-title">Поддержка и обратная связь</div>
          <div className="section-card">
            <div
              style={{
                padding: '10px 16px 6px',
                fontSize: 13.5,
                color: 'var(--on-surface-variant)',
              }}
            >
              Нашли ошибку или есть идея для улучшения — напишите нам в Telegram:
            </div>
            <ContactRow
              icon={<User size={20} color="var(--primary)" />}
              title="@Eadweardik"
              subtitle="t.me/Eadweardik"
              onClick={() => openExternalUrl('https://t.me/Eadweardik')}
              onCopy={() => copyText('@Eadweardik')}
            />
            <div className="divider" />
            <ContactRow
              icon={<User size={20} color="var(--primary)" />}
              title="@yasher2027"
              subtitle="t.me/yasher2027"
              onClick={() => openExternalUrl('https://t.me/yasher2027')}
              onCopy={() => copyText('@yasher2027')}
            />
          </div>
        </div>

        <div>
          <div className="section-title">Оригинальный ресурс</div>
          <div className="section-card">
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <FlaskConical size={22} color="var(--primary)" />
                <div>
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>Chemistry By Design</div>
                  <div style={{ fontSize: 12, color: 'var(--on-surface-variant)' }}>
                    Prof. Jon T. Njardarson Group · University of Arizona
                  </div>
                </div>
              </div>
              <div style={{ fontSize: 13.5, color: 'var(--on-surface-variant)', lineHeight: 1.4 }}>
                База полных синтезов и реакционных схем основана на образовательном проекте
                Chemistry By Design Университета Аризоны.
              </div>
            </div>
            <div className="divider" />
            <ContactRow
              icon={<Globe size={20} color="var(--primary)" />}
              title="Открыть Chemistry By Design"
              subtitle="chemistrybydesign.oia.arizona.edu"
              onClick={() => openExternalUrl('https://chemistrybydesign.oia.arizona.edu/')}
              onCopy={() => copyText('https://chemistrybydesign.oia.arizona.edu/')}
            />
          </div>
        </div>

        <div>
          <div className="section-title">Оформление и настройки</div>
          <div className="section-card">
            <div className="setting-block">
              <div style={{ fontSize: 14, fontWeight: 600 }}>Тема приложения</div>
              <div className="segmented">
                {(
                  [
                    ['system', 'Система'],
                    ['light', 'Светлая'],
                    ['dark', 'Тёмная'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`seg-btn ${themeMode === mode ? 'active' : ''}`}
                    onClick={() => onThemeModeChange(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divider" />

            <div className="setting-block">
              <div className="setting-row">
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Тёмный стиль формул</div>
                  <div style={{ fontSize: 13, color: 'var(--on-surface-variant)', marginTop: 2 }}>
                    В тёмной теме рисовать светлые формулы на тёмных карточках (выкл. — белая
                    бумага)
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={adaptiveDark}
                  className={`switch-btn ${adaptiveDark ? 'on' : ''}`}
                  onClick={() => onAdaptiveDarkChange(!adaptiveDark)}
                >
                  <span className="switch-knob" />
                </button>
              </div>
            </div>

            <div className="divider" />

            <div className="setting-block">
              <div style={{ fontSize: 14, fontWeight: 600 }}>Режим открытия синтеза</div>
              <div className="segmented">
                {(
                  [
                    ['feed', 'Лента'],
                    ['canvas', 'Схема'],
                  ] as const
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    className={`seg-btn ${defaultViewMode === mode ? 'active' : ''}`}
                    onClick={() => onDefaultViewModeChange(mode)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ContactRowProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  onCopy: () => void;
}

const ContactRow: React.FC<ContactRowProps> = ({ icon, title, subtitle, onClick, onCopy }) => (
  <div
    role="button"
    tabIndex={0}
    className="contact-row"
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        onClick();
      }
    }}
  >
    <div style={{ flexShrink: 0, display: 'flex' }}>{icon}</div>
    <div style={{ flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 14.5, fontWeight: 500 }}>{title}</div>
      <div
        style={{
          fontSize: 13,
          color: 'var(--on-surface-variant)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {subtitle}
      </div>
    </div>
    <button
      type="button"
      className="card-icon-btn"
      aria-label="Скопировать"
      onClick={(e) => {
        e.stopPropagation();
        onCopy();
      }}
    >
      <Copy size={17} />
    </button>
    <ExternalLink size={16} style={{ marginRight: 8, opacity: 0.65, flexShrink: 0 }} />
  </div>
);
