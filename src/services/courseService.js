import { db } from './firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    increment
} from 'firebase/firestore';

class CourseService {
    // Listar todos os cursos publicados
    static async getAllCourses() {
        try {
            const q = query(
                collection(db, 'courses'),
                where('published', '==', true),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            if (error.code === 'unavailable' || error.message.includes('offline')) {
                console.warn('[CourseService] Offline, returning empty list.');
                return [];
            }
            console.error('Error fetching courses:', error);
            throw error;
        }
    }

    // Buscar curso por ID
    static async getCourseById(courseId) {
        try {
            const docRef = doc(db, 'courses', courseId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return { id: docSnap.id, ...docSnap.data() };
            }
            return null;
        } catch (error) {
            console.error('Error fetching course:', error);
            throw error;
        }
    }

    // Buscar aulas de um curso
    static async getCourseLessons(courseId) {
        try {
            const q = query(
                collection(db, 'courses', courseId, 'lessons'),
                orderBy('order', 'asc')
            );
            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Error fetching lessons:', error);
            throw error;
        }
    }

    // Inscrever usuário em curso (Compatível com YouTube)
    static async enrollCourse(userId, course) {
        try {
            const courseId = course.id;
            const progressRef = doc(db, 'userProgress', userId, 'courses', courseId);
            const progressSnap = await getDoc(progressRef);

            if (progressSnap.exists()) {
                return { success: true, alreadyEnrolled: true };
            }

            // Save enrollment data
            await addDoc(collection(db, 'userProgress', userId, 'courses'), {
                courseId,
                courseTitle: course.title,
                courseThumbnail: course.thumbnail,
                courseSource: 'youtube', // Flag to identify source
                enrolledAt: serverTimestamp(),
                lastAccessedAt: serverTimestamp(),
                completedLessons: [],
                currentLesson: null,
                progress: 0,
                quizScores: {},
                certificateIssued: false
            });

            // For Firestore native courses, increment counter (skip for YouTube or optional)
            if (course.source !== 'youtube') {
                const courseRef = doc(db, 'courses', courseId);
                await updateDoc(courseRef, {
                    studentsCount: increment(1)
                });
            }

            return { success: true, alreadyEnrolled: false };
        } catch (error) {
            console.error('Error enrolling course:', error);

            // Fallback: If permission denied (common in dev/bad rules), 
            // allow user to proceed anyway locally.
            if (error.code === 'permission-denied') {
                console.warn('Permission denied saving enrollment. Proceeding locally.');
                return { success: true, alreadyEnrolled: false, localFallback: true };
            }

            throw error;
        }
    }

    // Buscar cursos inscritos do usuário
    static async getUserCourses(userId) {
        try {
            const q = query(collection(db, 'userProgress', userId, 'courses'));
            const snapshot = await getDocs(q);

            const enrollments = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Buscar detalhes dos cursos
            const courses = await Promise.all(
                enrollments.map(async (enrollment) => {
                    const course = await this.getCourseById(enrollment.courseId);
                    return {
                        ...course,
                        progress: enrollment.progress,
                        lastAccessedAt: enrollment.lastAccessedAt,
                        currentLesson: enrollment.currentLesson
                    };
                })
            );

            return courses;
        } catch (error) {
            console.error('Error fetching user courses:', error);
            throw error;
        }
    }

    // Marcar aula como completa
    static async completeLesson(userId, courseId, lessonId) {
        try {
            const progressRef = doc(db, 'userProgress', userId, 'courses', courseId);
            const progressSnap = await getDoc(progressRef);

            if (!progressSnap.exists()) {
                throw new Error('User not enrolled in course');
            }

            const data = progressSnap.data();
            const completedLessons = data.completedLessons || [];

            if (!completedLessons.includes(lessonId)) {
                completedLessons.push(lessonId);

                // Calcular progresso
                const course = await this.getCourseById(courseId);
                const progress = Math.round((completedLessons.length / course.lessonsCount) * 100);

                await updateDoc(progressRef, {
                    completedLessons,
                    progress,
                    lastAccessedAt: serverTimestamp()
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Error completing lesson:', error);
            throw error;
        }
    }
}

export default CourseService;
