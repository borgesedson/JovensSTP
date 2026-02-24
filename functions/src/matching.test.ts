import { describe, it, expect } from 'vitest';
import { calculateMatchScore, UserProfile } from './matching.js';

describe('Matching Logic', () => {
    const user1: UserProfile = {
        uid: '123',
        skills: ['JavaScript', 'React', 'Node.js'],
        location: 'Lisboa',
        experienceLevel: 'junior',
        interests: ['AI', 'Web Dev']
    };

    it('should calculate a high score for perfect matches', () => {
        const user2: UserProfile = {
            uid: '456',
            skills: ['JavaScript', 'React', 'Node.js'],
            location: 'Lisboa',
            experienceLevel: 'junior',
            interests: ['AI', 'Web Dev']
        };

        const result = calculateMatchScore(user1, user2);
        expect(result.score).toBe(100);
        expect(result.reasons).toContain('Ambos em Lisboa');
    });

    it('should calculate partial scores for different locations', () => {
        const user2: UserProfile = {
            uid: '456',
            skills: ['JavaScript'],
            location: 'Porto',
            experienceLevel: 'junior',
            interests: ['AI']
        };

        const result = calculateMatchScore(user1, user2);
        expect(result.score).toBeLessThan(100);
        expect(result.score).toBeGreaterThan(0);
    });

    it('should handle profiles with missing data', () => {
        const user2: UserProfile = { uid: '456' };
        const result = calculateMatchScore(user1, user2);
        expect(result.score).toBeDefined();
        expect(typeof result.score).toBe('number');
    });

    it('should identify compatible experience levels', () => {
        const user2: UserProfile = {
            uid: '456',
            experienceLevel: 'pleno'
        };
        const result = calculateMatchScore(user1, user2);
        expect(result.reasons).toContain('Nível de experiência compatível');
    });
});
