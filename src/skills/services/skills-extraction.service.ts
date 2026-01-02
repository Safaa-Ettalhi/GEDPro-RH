import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SkillsExtractionService {
  private readonly logger = new Logger(SkillsExtractionService.name);

  private readonly technicalSkills = [
    'javascript',
    'typescript',
    'python',
    'java',
    'c++',
    'c#',
    'php',
    'ruby',
    'go',
    'rust',
    'swift',
    'kotlin',
    'dart',
    'scala',
    'r',
    'matlab',
    // Frameworks
    'react',
    'angular',
    'vue',
    'node.js',
    'express',
    'nestjs',
    'django',
    'flask',
    'spring',
    'laravel',
    'symfony',
    'rails',
    'postgresql',
    'mysql',
    'mongodb',
    'redis',
    'elasticsearch',
    'oracle',
    'sql server',
    'sqlite',
    'aws',
    'azure',
    'gcp',
    'docker',
    'kubernetes',
    'jenkins',
    'gitlab ci',
    'github actions',
    'terraform',
    'ansible',
    'git',
    'linux',
    'bash',
    'powershell',
    'agile',
    'scrum',
    'jira',
    'confluence',
  ];

  private readonly languageSkills = [
    'français',
    'anglais',
    'espagnol',
    'allemand',
    'italien',
    'portugais',
    'arabe',
    'chinois',
    'japonais',
  ];

  private readonly softSkills = [
    'communication',
    'leadership',
    'travail en équipe',
    'gestion de projet',
    'résolution de problèmes',
    'créativité',
    'adaptabilité',
    'autonomie',
    'organisation',
    'gestion du temps',
    'négociation',
    'présentation',
  ];

  extractSkills(
    text: string,
  ): Array<{ name: string; category: string; confidence: number }> {
    if (!text || text.trim().length === 0) {
      return [];
    }

    const normalizedText = this.normalizeText(text);
    const foundSkills: Array<{
      name: string;
      category: string;
      confidence: number;
    }> = [];

    for (const skill of this.technicalSkills) {
      const confidence = this.findSkillInText(normalizedText, skill);
      if (confidence > 0) {
        foundSkills.push({
          name: this.capitalizeSkill(skill),
          category: 'technique',
          confidence,
        });
      }
    }

    for (const skill of this.languageSkills) {
      const confidence = this.findSkillInText(normalizedText, skill);
      if (confidence > 0) {
        foundSkills.push({
          name: this.capitalizeSkill(skill),
          category: 'langue',
          confidence,
        });
      }
    }

    for (const skill of this.softSkills) {
      const confidence = this.findSkillInText(normalizedText, skill);
      if (confidence > 0) {
        foundSkills.push({
          name: this.capitalizeSkill(skill),
          category: 'soft_skill',
          confidence,
        });
      }
    }

    const uniqueSkills = this.deduplicateSkills(foundSkills);
    return uniqueSkills.sort((a, b) => b.confidence - a.confidence);
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ');
  }

  private findSkillInText(text: string, skill: string): number {
    const normalizedSkill = this.normalizeText(skill);
    const skillWords = normalizedSkill.split(/\s+/);

    if (text.includes(normalizedSkill)) {
      return 1.0;
    }

    if (skillWords.length > 1) {
      const foundWords = skillWords.filter((word) => text.includes(word));
      if (foundWords.length >= Math.ceil(skillWords.length * 0.7)) {
        return 0.8;
      }
    }

    if (skillWords.length === 1) {
      const word = skillWords[0];
      const wordRegex = new RegExp(`\\b${word}\\b`, 'i');
      if (wordRegex.test(text)) {
        return 0.9;
      }
      if (text.includes(word)) {
        return 0.6;
      }
    }

    return 0;
  }

  private capitalizeSkill(skill: string): string {
    return skill
      .split(/\s+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private deduplicateSkills(
    skills: Array<{ name: string; category: string; confidence: number }>,
  ): Array<{ name: string; category: string; confidence: number }> {
    const skillMap = new Map<
      string,
      { name: string; category: string; confidence: number }
    >();

    for (const skill of skills) {
      const key = skill.name.toLowerCase();
      const existing = skillMap.get(key);

      if (!existing || existing.confidence < skill.confidence) {
        skillMap.set(key, skill);
      }
    }

    return Array.from(skillMap.values());
  }

  addCustomSkill(
    skill: string,
    category: 'technique' | 'langue' | 'soft_skill',
  ): void {
    const normalized = skill.toLowerCase();
    if (
      category === 'technique' &&
      !this.technicalSkills.includes(normalized)
    ) {
      this.technicalSkills.push(normalized);
    } else if (
      category === 'langue' &&
      !this.languageSkills.includes(normalized)
    ) {
      this.languageSkills.push(normalized);
    } else if (
      category === 'soft_skill' &&
      !this.softSkills.includes(normalized)
    ) {
      this.softSkills.push(normalized);
    }
  }
}
