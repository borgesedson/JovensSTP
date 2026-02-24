// Service para tocar sons de notificação


// Serviço de som restrito apenas para chamadas
class NotificationSoundService {
  constructor() {
    this.sounds = {
      call: new Audio('/sounds/ringtone.mp3')
    }
    this.sounds.call.loop = true
    this.sounds.call.preload = 'auto'
  }

  playCallSound() {
    // Parar se já estiver tocando
    this.sounds.call.pause()
    this.sounds.call.currentTime = 0
    this.sounds.call.play()
      .then(() => console.log('✅ Som de chamada tocado'))
      .catch(err => {
        console.error('❌ Erro ao tocar som de chamada:', err)
      })
  }

  stopCallSound() {
    this.sounds.call.pause()
    this.sounds.call.currentTime = 0
  }
}

export const notificationSounds = new NotificationSoundService()
