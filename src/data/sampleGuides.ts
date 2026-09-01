import type { Guide } from '../types/guide';

export const SAMPLE_GUIDES: Guide[] = [
  {
    meta: {
      id: 'guide-new-1',
      title: 'New Minecraft Guide',
      category: 'Общий',
      author: 'Author',
      difficulty: 'Новичок',
      summary: 'Empty guide template ready for editing.',
      updatedAt: new Date().toISOString().split('T')[0],
      published: false
    },
    blocks: [
      {
        id: 'b_init_1',
        type: 'heading',
        headingText: 'Guide Overview',
        headingLevel: 'h1'
      },
      {
        id: 'b_init_2',
        type: 'text',
        textContent: 'Write your guide instructions here...'
      }
    ]
  }
];
