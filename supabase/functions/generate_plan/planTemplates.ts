// Standardized plan templates for different goal categories

export interface MicroCommitment {
  day_of_week: number;
  title: string;
  description: string;
  duration_minutes: number;
}

export interface WeeklyPlan {
  week_number: number;
  theme: string;
  focus: string;
  micro_commitments: MicroCommitment[];
}

export interface PlanTemplate {
  category: string;
  weekly_themes: string[];
  daily_actions: {
    [week: number]: {
      [day: number]: {
        title: string;
        description: string;
        duration: number;
      };
    };
  };
}

// Universal plan templates that adapt to any goal
export const PLAN_TEMPLATES: { [key: string]: PlanTemplate } = {
  financial: {
    category: 'financial',
    weekly_themes: [
      'Financial Foundation',
      'Saving Strategies', 
      'Expense Optimization',
      'Goal Achievement'
    ],
    daily_actions: {
      1: {
        1: { title: 'Track daily expenses', description: 'Record every purchase to build awareness', duration: 10 },
        2: { title: 'Review spending', description: 'Analyze yesterday\'s expenses', duration: 10 },
        3: { title: 'Set daily budget', description: 'Plan spending for today', duration: 15 },
        4: { title: 'Find one saving', description: 'Identify one way to save money today', duration: 10 },
        5: { title: 'Check account balance', description: 'Monitor your financial position', duration: 5 },
        6: { title: 'Plan weekend spending', description: 'Budget for weekend activities', duration: 15 },
        7: { title: 'Weekly financial review', description: 'Assess progress and plan next week', duration: 20 }
      }
    }
  },
  
  creative: {
    category: 'creative',
    weekly_themes: [
      'Creative Foundation',
      'Skill Building',
      'Creative Flow',
      'Project Completion'
    ],
    daily_actions: {
      1: {
        1: { title: 'Morning pages', description: 'Write 3 pages of stream-of-consciousness', duration: 20 },
        2: { title: 'Idea capture', description: 'Record 5 new creative ideas', duration: 15 },
        3: { title: 'Practice basics', description: 'Work on fundamental skills', duration: 25 },
        4: { title: 'Study inspiration', description: 'Analyze work you admire', duration: 15 },
        5: { title: 'Create something', description: 'Make something, anything', duration: 30 },
        6: { title: 'Share your work', description: 'Get feedback from others', duration: 10 },
        7: { title: 'Reflect on progress', description: 'Review what you\'ve created this week', duration: 20 }
      }
    }
  },

  fitness: {
    category: 'fitness',
    weekly_themes: [
      'Movement Foundation',
      'Strength Building',
      'Endurance Development', 
      'Peak Performance'
    ],
    daily_actions: {
      1: {
        1: { title: 'Morning stretch', description: 'Gentle stretching to start the day', duration: 10 },
        2: { title: 'Walk or light cardio', description: 'Get your heart rate up', duration: 15 },
        3: { title: 'Bodyweight exercises', description: 'Push-ups, squats, or planks', duration: 15 },
        4: { title: 'Active recovery', description: 'Gentle movement or yoga', duration: 10 },
        5: { title: 'Strength training', description: 'Focus on major muscle groups', duration: 20 },
        6: { title: 'Fun activity', description: 'Dance, sports, or active hobby', duration: 25 },
        7: { title: 'Rest and reflect', description: 'Light stretching and progress review', duration: 15 }
      }
    }
  },

  learning: {
    category: 'learning',
    weekly_themes: [
      'Learning Foundation',
      'Knowledge Building',
      'Skill Application',
      'Mastery Development'
    ],
    daily_actions: {
      1: {
        1: { title: 'Read/study basics', description: 'Learn fundamental concepts', duration: 20 },
        2: { title: 'Take notes', description: 'Summarize what you learned', duration: 15 },
        3: { title: 'Practice exercises', description: 'Apply knowledge through practice', duration: 25 },
        4: { title: 'Teach someone else', description: 'Explain concepts to solidify understanding', duration: 15 },
        5: { title: 'Solve problems', description: 'Work through challenging exercises', duration: 30 },
        6: { title: 'Review and connect', description: 'Link new knowledge to existing understanding', duration: 20 },
        7: { title: 'Plan next steps', description: 'Identify what to learn next week', duration: 15 }
      }
    }
  },

  health: {
    category: 'health',
    weekly_themes: [
      'Healthy Habits',
      'Routine Building',
      'Consistency Focus',
      'Lifestyle Integration'
    ],
    daily_actions: {
      1: {
        1: { title: 'Morning routine', description: 'Start day with healthy habit', duration: 15 },
        2: { title: 'Mindful eating', description: 'Pay attention to nutrition', duration: 10 },
        3: { title: 'Hydration check', description: 'Ensure adequate water intake', duration: 5 },
        4: { title: 'Stress management', description: 'Practice relaxation technique', duration: 15 },
        5: { title: 'Quality sleep prep', description: 'Prepare for good night\'s rest', duration: 10 },
        6: { title: 'Self-care activity', description: 'Do something nurturing for yourself', duration: 20 },
        7: { title: 'Health reflection', description: 'Assess how you feel this week', duration: 15 }
      }
    }
  },

  general: {
    category: 'general',
    weekly_themes: [
      'Foundation Building',
      'Skill Development',
      'Consistency Challenge',
      'Goal Achievement'
    ],
    daily_actions: {
      1: {
        1: { title: 'Start small', description: 'Take the first step toward your goal', duration: 10 },
        2: { title: 'Build routine', description: 'Repeat yesterday\'s action to create habit', duration: 10 },
        3: { title: 'Stay consistent', description: 'Maintain your new daily practice', duration: 15 },
        4: { title: 'Reflect & adjust', description: 'Notice what\'s working and what isn\'t', duration: 10 },
        5: { title: 'Push forward', description: 'Increase effort slightly', duration: 15 },
        6: { title: 'Practice patience', description: 'Focus on process over results', duration: 10 },
        7: { title: 'Weekly review', description: 'Celebrate progress and plan next week', duration: 20 }
      }
    }
  }
};

export function generateStandardizedPlan(
  goalCategory: string,
  monthlyGoal: string,
  dailyTimeMinutes: number = 15
): any {
  const template = PLAN_TEMPLATES[goalCategory] || PLAN_TEMPLATES.general;
  
  const weeklyPlans = [];
  
  for (let week = 1; week <= 4; week++) {
    const weekData = template.daily_actions[week] || template.daily_actions[1];
    const microCommitments = [];
    
    for (let day = 1; day <= 7; day++) {
      const dayAction = weekData[day] || weekData[1];
      microCommitments.push({
        day_of_week: day,
        title: dayAction.title,
        description: dayAction.description,
        duration_minutes: Math.min(dayAction.duration, dailyTimeMinutes + 10)
      });
    }
    
    weeklyPlans.push({
      week_number: week,
      theme: template.weekly_themes[week - 1],
      focus: `Week ${week} focus: ${template.weekly_themes[week - 1]}`,
      micro_commitments: microCommitments
    });
  }
  
  return {
    success: true,
    plan: {
      monthly_goal: monthlyGoal,
      category: goalCategory,
      weekly_plans: weeklyPlans
    }
  };
}
