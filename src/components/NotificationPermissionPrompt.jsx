import React, { useState, useEffect, useContext } from 'react';
import { Bell, X } from 'lucide-react';
import { registerForPush } from '../services/notifications';
import { useAuth } from '../hooks/useAuth';
import { toast } from 'react-hot-toast';
import { StreamContext } from '../contexts/streamContextValue';

/**
 * Componente que solicita permissão de notificações push
 * Aparece como banner no topo do app quando a permissão ainda não foi concedida
 */
const NotificationPermissionPrompt = () => {
  const { user } = useAuth();
  const { chatClient } = useContext(StreamContext);
  const [show, setShow] = useState(false);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    // Verificar se deve mostrar o prompt
    const checkPermission = () => {
      if (!user) return;

      // Verificar se o navegador suporta notificações
      if (!('Notification' in window)) {
        console.log('Este navegador não suporta notificações');
        return;
      }

      // Verificar se já foi perguntado antes
      const hasAsked = localStorage.getItem('notificationAsked');

      // Mostrar apenas se:
      // 1. Permissão ainda não foi concedida
      // 2. Permissão não foi negada permanentemente
      // 3. Ainda não perguntamos antes (ou usuário fechou)
      if (Notification.permission === 'default' && !hasAsked) {
        // Aguardar 5 segundos após login para não ser intrusivo
        setTimeout(() => setShow(true), 5000);
      }
    };

    checkPermission();
  }, [user]);

  const handleRequestPermission = async () => {
    setRequesting(true);

    try {
      // Solicitar permissão
      const permission = await Notification.requestPermission();

      if (permission === 'granted') {
        toast.success('Notificações ativadas! 🔔');

        // Registrar token FCM localmente e no Firestore
        const fcmToken = await registerForPush(user.uid);

        // ✅ NOVO: Se o chat estiver conectado, registrar o dispositivo no Stream imediatamente
        try {
          if (chatClient && fcmToken) {
            console.log('📡 Registrando dispositivo no Stream pós-permissão...');
            await chatClient.addDevice(fcmToken, 'firebase', user.uid, 'Firebase');
            console.log('✅ Dispositivo registrado com sucesso no Stream.');
          }
        } catch (streamErr) {
          console.warn('Erro ao sincronizar com Stream pós-permissão:', streamErr);
        }

        // Marcar que já perguntamos
        localStorage.setItem('notificationAsked', 'true');
        setShow(false);
      } else if (permission === 'denied') {
        toast.error('Notificações bloqueadas. Ative nas configurações do navegador.');
        localStorage.setItem('notificationAsked', 'true');
        setShow(false);
      } else {
        // Default - usuário fechou sem decidir
        setShow(false);
      }
    } catch (error) {
      console.error('Erro ao solicitar permissão de notificações:', error);
      toast.error('Erro ao ativar notificações');
    } finally {
      setRequesting(false);
    }
  };

  const handleDismiss = () => {
    localStorage.setItem('notificationAsked', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed top-16 left-0 right-0 z-40 bg-gradient-to-r from-green-600 to-blue-600 text-white shadow-lg animate-slide-down">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3 flex-1">
          <div className="bg-white bg-opacity-20 rounded-full p-2">
            <Bell className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-sm md:text-base">
              Ative as notificações
            </p>
            <p className="text-xs md:text-sm text-white text-opacity-90">
              Receba chamadas, mensagens e atualizações mesmo com o app fechado
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2 ml-4">
          <button
            onClick={handleRequestPermission}
            disabled={requesting}
            className="bg-white text-green-600 font-semibold px-4 py-2 rounded-full text-sm hover:bg-opacity-90 transition-all disabled:opacity-50"
          >
            {requesting ? 'Ativando...' : 'Ativar'}
          </button>
          <button
            onClick={handleDismiss}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPermissionPrompt;
