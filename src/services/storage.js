import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { app } from './firebase'

const storage = getStorage(app)

// Upload a user avatar file and return its download URL
export const uploadUserAvatar = async (uid, file) => {
  if (!uid || !file) throw new Error('Missing uid or file')
  const avatarRef = ref(storage, `avatars/${uid}`)
  await uploadBytes(avatarRef, file, { contentType: file.type })
  return getDownloadURL(avatarRef)
}

// Upload educational materials (PDF/Video)
export const uploadEducationalMaterial = async (uid, file, type) => {
  if (!uid || !file) throw new Error('Missing uid or file')
  const timestamp = Date.now()
  const fileName = `${timestamp}_${file.name}`
  const materialRef = ref(storage, `materials/${type}/${uid}/${fileName}`)

  await uploadBytes(materialRef, file, { contentType: file.type })
  return getDownloadURL(materialRef)
}
