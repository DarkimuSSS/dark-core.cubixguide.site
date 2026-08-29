import type { Guide } from '../types/guide';
import { PRESET_ITEMS } from './presetItems';

const getItem = (id: string) => PRESET_ITEMS.find(item => item.id === id) || null;

export const SAMPLE_GUIDES: Guide[] = [
  {
    meta: {
      id: 'guide-ae2-controller',
      title: 'Applied Energistics 2: ME Controller & Network Setup',
      category: 'HiTech',
      author: 'AetherEngineer',
      difficulty: 'Intermediate',
      summary: 'Complete setup tutorial for crafting ME Controllers, managing channels, and establishing digital item storage.',
      updatedAt: '2026-08-28',
      published: true
    },
    blocks: [
      {
        id: 'b1',
        type: 'heading',
        headingText: 'Overview & Essential Requirements',
        headingLevel: 'h1'
      },
      {
        id: 'b2',
        type: 'text',
        textContent: 'The ME Controller serves as the brain of your Applied Energistics 2 network. Without it, ad-hoc networks are limited to 8 channels maximum. Once crafted, each face of the ME Controller provides up to 32 channels via ME Dense Smart Cables.'
      },
      {
        id: 'b3',
        type: 'callout',
        calloutType: 'tip',
        calloutTitle: 'Pro Channel Management Tip',
        calloutText: 'Never place ME Controllers in an invalid multiblock ring. Controllers must form a valid contiguous structure with maximum dimensions of 7x7x7, where no controller block touches more than 3 adjacent controllers.'
      },
      {
        id: 'b4',
        type: 'heading',
        headingText: 'Crafting the ME Controller',
        headingLevel: 'h2'
      },
      {
        id: 'b5',
        type: 'crafting',
        craftingGrid: [
          { index: 0, item: getItem('ae2_pure_certus'), count: 1, tooltip: 'Top left corner' },
          { index: 1, item: getItem('ae2_engineering_processor'), count: 1, tooltip: 'Top center' },
          { index: 2, item: getItem('ae2_pure_certus'), count: 1, tooltip: 'Top right corner' },
          { index: 3, item: getItem('ae2_fluix_crystal'), count: 1, tooltip: 'Middle left' },
          { index: 4, item: getItem('vanilla_obsidian'), count: 1, tooltip: 'Center core' },
          { index: 5, item: getItem('ae2_fluix_crystal'), count: 1, tooltip: 'Middle right' },
          { index: 6, item: getItem('ae2_pure_certus'), count: 1, tooltip: 'Bottom left' },
          { index: 7, item: getItem('ae2_logic_processor'), count: 1, tooltip: 'Bottom center' },
          { index: 8, item: getItem('ae2_pure_certus'), count: 1, tooltip: 'Bottom right' }
        ],
        craftingOutput: {
          index: 9,
          item: getItem('ae2_me_controller'),
          count: 1,
          tooltip: 'ME Controller block'
        }
      },
      {
        id: 'b6',
        type: 'callout',
        calloutType: 'warning',
        calloutTitle: 'Power Consumption Warning',
        calloutText: 'ME Controllers require constant AE power. Ensure your Energy Acceptor is connected before booting up storage drives to prevent network brownouts.'
      },
      {
        id: 'b7',
        type: 'heading',
        headingText: 'Step-by-Step Commissioning Checklist',
        headingLevel: 'h2'
      },
      {
        id: 'b8',
        type: 'checklist',
        checklistTitle: 'Network Assembly Workflow',
        checklistItems: [
          { id: 'c1', text: 'Craft 4x Pure Certus Quartz and 2x Engineering Processors', completed: true },
          { id: 'c2', text: 'Assemble ME Controller in 3x3 crafting grid', completed: true },
          { id: 'c3', text: 'Connect Energy Acceptor with FE power source', completed: false },
          { id: 'c4', text: 'Attach ME Dense Cables to output faces', completed: false },
          { id: 'c5', text: 'Insert 64K Storage Cell into ME Drive chassis', completed: false }
        ]
      }
    ]
  },
  {
    meta: {
      id: 'guide-extreme-reactor',
      title: 'Extreme Reactors: 3x3x3 Passive Power Generator',
      category: 'Automation',
      author: 'NuclearCraftsman',
      difficulty: 'Beginner',
      summary: 'Learn how to build a compact, explosion-proof multiblock nuclear reactor step-by-step.',
      updatedAt: '2026-08-29',
      published: true
    },
    blocks: [
      {
        id: 'er1',
        type: 'heading',
        headingText: 'Reactor Layer Construction (3x3x3)',
        headingLevel: 'h1'
      },
      {
        id: 'er2',
        type: 'text',
        textContent: 'Extreme Reactors require a hollow rectangular structure constructed from Reactor Casings, Reactor Glass, a Control Rod, Fuel Rods, and Ports.'
      },
      {
        id: 'er3',
        type: 'multiblock',
        gridSize: 3,
        palette: [
          { id: 'reactor_casing', name: 'Reactor Casing', icon: 'Box', color: '#475569' },
          { id: 'reactor_glass', name: 'Reactor Glass', icon: 'Grid', color: '#38bdf8' },
          { id: 'control_rod', name: 'Control Rod', icon: 'Sliders', color: '#10b981' },
          { id: 'fuel_rod', name: 'Fuel Rod', icon: 'Zap', color: '#f59e0b' },
          { id: 'reactor_controller', name: 'Reactor Controller', icon: 'Cpu', color: '#8b5cf6' },
          { id: 'access_port', name: 'Access Port', icon: 'ArrowDownRight', color: '#ec4899' }
        ],
        layers: [
          {
            layerNumber: 1, // Bottom Layer (Y=1)
            grid: [
              ['reactor_casing', 'reactor_casing', 'reactor_casing'],
              ['reactor_casing', 'reactor_casing', 'reactor_casing'],
              ['reactor_casing', 'reactor_casing', 'reactor_casing']
            ]
          },
          {
            layerNumber: 2, // Middle Layer (Y=2)
            grid: [
              ['reactor_casing', 'reactor_controller', 'reactor_casing'],
              ['access_port', 'fuel_rod', 'access_port'],
              ['reactor_casing', 'reactor_glass', 'reactor_casing']
            ]
          },
          {
            layerNumber: 3, // Top Layer (Y=3)
            grid: [
              ['reactor_casing', 'reactor_casing', 'reactor_casing'],
              ['reactor_casing', 'control_rod', 'reactor_casing'],
              ['reactor_casing', 'reactor_casing', 'reactor_casing']
            ]
          }
        ]
      },
      {
        id: 'er4',
        type: 'callout',
        calloutType: 'danger',
        calloutTitle: 'Redstone Fuel Logic',
        calloutText: 'Always connect a Redstone Port or Computer Port to auto-throttle the Control Rod when internal power buffer exceeds 90% capacity to avoid waste.'
      }
    ]
  }
];
