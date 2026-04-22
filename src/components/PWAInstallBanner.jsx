import React, { useState, useEffect, useCallback } from 'react';
import { Download, X, Share, PlusSquare, ChevronUp, Smartphone, Rocket } from 'lucide-react';

/**
 * PWA Install Banner
 * - Android/Desktop: captures beforeinstallprompt and triggers native install
 * - iOS Safari: shows step-by-step instructions (Share → Add to Home Screen)
 * - Remembers dismissal for 7 days via localStorage
 */
export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showBanner, setShowBanner] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSSteps, setShowIOSSteps] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Check if already installed as PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (isStandalone) {
      setIsInstalled(true);
      return;
    }

    // Check if user dismissed recently (7 days)
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      if (Date.now() - dismissedAt < sevenDays) return;
    }

    // Detect iOS
    const isIOSDevice =
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);

    if (isIOSDevice && isSafari) {
      setIsIOS(true);
      // Show after 3 seconds
      const timer = setTimeout(() => setShowBanner(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android/Desktop: listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Show after 3 seconds
      setTimeout(() => setShowBanner(true), 3000);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Listen for successful install
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowBanner(false);
      setDeferredPrompt(null);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setShowBanner(false);
      }
    } catch (err) {
      console.warn('Install prompt error:', err);
    }
    setInstalling(false);
    setDeferredPrompt(null);
  }, [deferredPrompt]);

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (isInstalled || !showBanner) return null;

  // iOS Safari instructions
  if (isIOS) {
    return (
      <div style={styles.overlay}>
        <div style={styles.banner}>
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
              <h3 style={styles.title}>Instalar JovensSTP</h3>
              <p style={styles.subtitle}>Acesso rápido como app no teu telemóvel</p>
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
                  <span>Toque no botão <strong>Compartilhar</strong> <Share size={14} style={{ verticalAlign: 'middle'}} /> em baixo</span>
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

              {/* Arrow pointing down for Safari */}
              <div style={styles.arrowContainer}>
                <ChevronUp size={24} color="#16a34a" style={{ transform: 'rotate(180deg)', animation: 'bounceDown 1s infinite' }} />
              </div>
            </div>
          )}

          <p style={styles.benefit}>✨ Funciona offline • Notificações • Mais rápido</p>
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
        `}</style>
      </div>
    );
  }

  // Android / Desktop banner
  return (
    <div style={styles.overlay}>
      <div style={styles.banner}>
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
            <h3 style={styles.title}>Instalar JovensSTP</h3>
            <p style={styles.subtitle}>Acesso direto como app no teu dispositivo</p>
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
          }}
        >
          <Download size={20} />
          {installing ? 'Instalando...' : 'Instalar Agora — É Grátis!'}
        </button>

        <button onClick={handleDismiss} style={styles.laterBtn}>
          Talvez mais tarde
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 99999,
    display: 'flex',
    justifyContent: 'center',
    padding: '0 16px 16px',
    pointerEvents: 'none',
  },
  banner: {
    pointerEvents: 'all',
    width: '100%',
    maxWidth: 420,
    background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
    borderRadius: 24,
    padding: '24px 20px 20px',
    boxShadow: '0 -4px 40px rgba(0,0,0,0.15), 0 0 0 1px rgba(22,163,74,0.1)',
    position: 'relative',
    animation: 'slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
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
