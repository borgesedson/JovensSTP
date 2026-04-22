import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, Share, PlusSquare, ChevronUp, Smartphone, Rocket } from 'lucide-react';
import { useLocation } from 'react-router-dom';

/**
 * PWA Install Banner — Persistent Version
 * - Shows on every page navigation if not installed
 * - If dismissed, re-appears after 30 seconds or on next page change
 * - Semi-transparent backdrop to draw attention
 * - Android/Desktop: captures beforeinstallprompt for native install
 * - iOS Safari: shows step-by-step instructions
 */
export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [dismissCount, setDismissCount] = useState(0);
  const location = useLocation();

  // Check if already installed
  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
    }
  }, []);

  // Detect platform and listen for install prompt
  useEffect(() => {
    if (isInstalled) return;

    // Detect iOS
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    if (isIOSDevice && isSafari) {
      setIsIOS(true);
    }

    // Android/Desktop: listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [isInstalled]);

  // Show banner on every page navigation (persistent behavior)
  useEffect(() => {
    if (isInstalled) return;

    // Small delay so it doesn't flash immediately on navigate
    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [location.pathname, isInstalled]);

  // Re-show banner 30 seconds after dismissal
  useEffect(() => {
    if (isInstalled || showBanner || dismissCount === 0) return;

    const timer = setTimeout(() => {
      setShowBanner(true);
    }, 30000); // 30 seconds

    return () => clearTimeout(timer);
  }, [dismissCount, showBanner, isInstalled]);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
        setIsInstalled(true);
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    setInstalling(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setShowBanner(false);
    setDismissCount(prev => prev + 1);
  };

  if (isInstalled || !showBanner) return null;

  // After 3 dismissals, show a more urgent message
  const isUrgent = dismissCount >= 3;

  // iOS Safari instructions
  if (isIOS) {
    return (
      <div style={styles.backdrop}>
        <div style={styles.overlay}>
          <div style={{...styles.banner, ...(isUrgent ? styles.urgentBanner : {})}}>
            {/* Close button */}
            <button onClick={handleDismiss} style={styles.closeBtn} aria-label="Fechar">
              <X size={18} />
            </button>

            {/* Header */}
            <div style={styles.header}>
              <div style={styles.iconCircle}>
                <Rocket size={24} color="#fff" />
              </div>
              <div>
                <h3 style={styles.title}>
                  {isUrgent ? '📲 Instala o App para Continuar!' : 'Instalar JovensSTP'}
                </h3>
                <p style={styles.subtitle}>
                  {isUrgent
                    ? 'A melhor experiência é com o app instalado'
                    : 'Acesso rápido como app no teu telemóvel'}
                </p>
              </div>
            </div>

            {/* Steps */}
            {!showIOSSteps ? (
              <button onClick={() => setShowIOSSteps(true)} style={styles.installBtn}>
                <Smartphone size={20} />
                Ver Como Instalar
              </button>
            ) : (
              <div style={styles.steps}>
                <div style={styles.step}>
                  <div style={styles.stepNumber}>1</div>
                  <div style={styles.stepContent}>
                    <Share size={18} color="#16a34a" style={{ marginRight: 8 }} />
                    <span>Toque no botão <strong>Compartilhar</strong> em baixo</span>
                  </div>
                </div>
                <div style={styles.step}>
                  <div style={styles.stepNumber}>2</div>
                  <div style={styles.stepContent}>
                    <PlusSquare size={18} color="#16a34a" style={{ marginRight: 8 }} />
                    <span>Escolha <strong>"Adicionar à Tela de Início"</strong></span>
                  </div>
                </div>
                <div style={styles.step}>
                  <div style={styles.stepNumber}>3</div>
                  <div style={styles.stepContent}>
                    <Rocket size={18} color="#16a34a" style={{ marginRight: 8 }} />
                    <span>Toque <strong>"Adicionar"</strong> e pronto!</span>
                  </div>
                </div>

                <div style={styles.arrowContainer}>
                  <ChevronUp size={24} color="#16a34a" style={{ transform: 'rotate(180deg)', animation: 'bounceDown 1s infinite' }} />
                </div>
              </div>
            )}

            <p style={styles.benefit}>✨ Funciona offline • Notificações • Mais rápido</p>

            <button onClick={handleDismiss} style={styles.laterBtn}>
              {isUrgent ? 'Continuar sem instalar' : 'Talvez mais tarde'}
            </button>
          </div>
        </div>

        <style>{`
          @keyframes bounceDown {
            0%, 100% { transform: rotate(180deg) translateY(0); }
            50% { transform: rotate(180deg) translateY(6px); }
          }
          @keyframes slideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.4); }
            50% { box-shadow: 0 0 0 12px rgba(22,163,74,0); }
          }
        `}</style>
      </div>
    );
  }

  // Android / Desktop banner
  return (
    <div style={styles.backdrop}>
      <div style={styles.overlay}>
        <div style={{...styles.banner, ...(isUrgent ? styles.urgentBanner : {})}}>
          {/* Close button */}
          <button onClick={handleDismiss} style={styles.closeBtn} aria-label="Fechar">
            <X size={18} />
          </button>

          {/* Header */}
          <div style={styles.header}>
            <div style={{...styles.iconCircle, ...(isUrgent ? { animation: 'pulse 2s infinite' } : {})}}>
              <Rocket size={24} color="#fff" />
            </div>
            <div>
              <h3 style={styles.title}>
                {isUrgent ? '📲 Instala o App para Continuar!' : 'Instalar JovensSTP'}
              </h3>
              <p style={styles.subtitle}>
                {isUrgent
                  ? 'Tem a melhor experiência com o app instalado'
                  : 'Acesso direto como app no teu dispositivo'}
              </p>
            </div>
          </div>

          {/* Benefits */}
          <div style={styles.benefits}>
            <div style={styles.benefitItem}>
              <span style={styles.benefitIcon}>⚡</span>
              <span style={styles.benefitText}>Mais rápido</span>
            </div>
            <div style={styles.benefitItem}>
              <span style={styles.benefitIcon}>🔔</span>
              <span style={styles.benefitText}>Notificações</span>
            </div>
            <div style={styles.benefitItem}>
              <span style={styles.benefitIcon}>📱</span>
              <span style={styles.benefitText}>Como app nativo</span>
            </div>
          </div>

          {/* Install button */}
          <button
            onClick={handleInstall}
            disabled={installing}
            style={{
              ...styles.installBtn,
              opacity: installing ? 0.7 : 1,
              ...(isUrgent ? { animation: 'pulse 2s infinite' } : {}),
            }}
          >
            <Download size={20} />
            {installing ? 'Instalando...' : 'Instalar Agora — É Grátis!'}
          </button>

          <button onClick={handleDismiss} style={styles.laterBtn}>
            {isUrgent ? 'Continuar sem instalar' : 'Talvez mais tarde'}
          </button>

          {dismissCount >= 1 && (
            <p style={styles.reminderText}>
              💡 Instalar leva apenas 2 segundos e melhora muito a tua experiência!
            </p>
          )}
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.4); }
          50% { box-shadow: 0 0 0 12px rgba(22,163,74,0); }
        }
      `}</style>
    </div>
  );
}

const styles = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)',
    zIndex: 99999,
    animation: 'fadeIn 0.3s ease',
  },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 16px 16px',
  },
  banner: {
    width: '100%',
    maxWidth: 420,
    background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
    borderRadius: 24,
    padding: '24px 20px 20px',
    boxShadow: '0 -4px 40px rgba(0,0,0,0.2), 0 0 0 1px rgba(22,163,74,0.1)',
    position: 'relative',
    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
  },
  urgentBanner: {
    border: '2px solid #16a34a',
    boxShadow: '0 -4px 40px rgba(22,163,74,0.3), 0 0 0 1px rgba(22,163,74,0.2)',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    background: 'rgba(0,0,0,0.05)',
    border: 'none',
    borderRadius: '50%',
    width: 32,
    height: 32,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: '#666',
    transition: 'background 0.2s',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    background: 'linear-gradient(135deg, #16a34a, #003B32)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(22,163,74,0.3)',
  },
  title: {
    margin: 0,
    fontSize: 18,
    fontWeight: 800,
    color: '#003B32',
    letterSpacing: '-0.02em',
  },
  subtitle: {
    margin: '2px 0 0',
    fontSize: 13,
    color: '#6b7280',
    fontWeight: 500,
  },
  benefits: {
    display: 'flex',
    gap: 8,
    marginBottom: 16,
  },
  benefitItem: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
    padding: '10px 6px',
    background: 'rgba(22,163,74,0.06)',
    borderRadius: 12,
    border: '1px solid rgba(22,163,74,0.1)',
  },
  benefitIcon: {
    fontSize: 18,
  },
  benefitText: {
    fontSize: 11,
    fontWeight: 700,
    color: '#003B32',
    textAlign: 'center',
  },
  installBtn: {
    width: '100%',
    padding: '14px 20px',
    background: 'linear-gradient(135deg, #16a34a, #15803d)',
    color: '#fff',
    border: 'none',
    borderRadius: 16,
    fontSize: 16,
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    boxShadow: '0 4px 16px rgba(22,163,74,0.3)',
    transition: 'transform 0.15s, box-shadow 0.15s',
  },
  laterBtn: {
    width: '100%',
    padding: '10px',
    background: 'transparent',
    color: '#9ca3af',
    border: 'none',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    marginTop: 6,
    textAlign: 'center',
  },
  reminderText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#16a34a',
    fontWeight: 600,
    margin: '8px 0 0',
    padding: '8px 12px',
    background: 'rgba(22,163,74,0.06)',
    borderRadius: 10,
  },
  steps: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    marginBottom: 16,
  },
  step: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: '#fff',
    borderRadius: 14,
    border: '1px solid rgba(22,163,74,0.12)',
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #16a34a, #003B32)',
    color: '#fff',
    fontSize: 14,
    fontWeight: 800,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  stepContent: {
    display: 'flex',
    alignItems: 'center',
    fontSize: 14,
    color: '#374151',
    fontWeight: 500,
    lineHeight: 1.4,
  },
  arrowContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: 4,
  },
  benefit: {
    textAlign: 'center',
    fontSize: 12,
    color: '#9ca3af',
    fontWeight: 600,
    margin: '12px 0 0',
  },
};
