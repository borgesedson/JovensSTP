import { db } from './firebase';
import {
    collection,
    query,
    where,
    orderBy,
    getDocs,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';

const ACADEMY_COLLECTION = 'academy_content';

export const getAcademyContent = async (category = 'all') => {
    try {
        const ref = collection(db, ACADEMY_COLLECTION);
        let q;

        if (category === 'all') {
            q = query(ref, orderBy('createdAt', 'desc'));
        } else {
            q = query(ref, where('category', '==', category), orderBy('createdAt', 'desc'));
        }

        const snap = await getDocs(q);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching academy content:', error);
        return [];
    }
};

export const addAcademyContent = async (contentData) => {
    try {
        const res = await addDoc(collection(db, ACADEMY_COLLECTION), {
            ...contentData,
            createdAt: serverTimestamp(),
        });
        return { success: true, id: res.id };
    } catch (error) {
        console.error('Error adding academy content:', error);
        return { success: false, error };
    }
};
