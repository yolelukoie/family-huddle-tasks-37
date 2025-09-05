import type { CharacterStage, Badge } from './types';

export const ROUTES = {
  main: '/',
  onboarding: '/onboarding',
  tasks: '/tasks',
  goals: '/goals',
  chat: '/chat',
  family: '/family',
} as const;

export const CHARACTER_STAGES: CharacterStage[] = [
  { stage: 0, requiredStars: 0, name: 'Baby' },
  { stage: 50, requiredStars: 50, name: 'Child' },
  { stage: 200, requiredStars: 200, name: 'Teen' },
  { stage: 350, requiredStars: 350, name: 'Young Adult' },
  { stage: 600, requiredStars: 600, name: 'Adult' },
  { stage: 700, requiredStars: 700, name: 'Mature Adult' },
  { stage: 800, requiredStars: 800, name: 'Senior' },
  { stage: 1000, requiredStars: 1000, name: 'Elder' },
];

export const DEFAULT_CATEGORIES = [
  { name: 'House Chores', isHouseChores: true, order: 0 },
  { name: 'Personal Growth', isHouseChores: false, order: 1 },
  { name: 'Happiness', isHouseChores: false, order: 2 },
];

export const DEFAULT_HOUSE_CHORES = [
  { name: 'Clean the room', starValue: 5 },
  { name: 'Do the dishes', starValue: 3 },
  { name: 'Take out trash', starValue: 2 },
  { name: 'Cook meal', starValue: 8 },
];

export const MAX_CATEGORIES = 10;
export const MAX_STAR_VALUE = 20;
export const CELEBRATION_THROTTLE_MS = 2000;
export const BADGE_UNLOCK_INTERVAL = 10;

export const BABY_STAGE_BADGES: Badge[] = [
  { id: 'baby_10', name: 'Pacifier', description: 'First smile melts everyone\'s heart!', imagePath: '/lovable-uploads/13216a33-9e76-4183-9b6e-781601ca3eb6.png', unlockStars: 10 },
  { id: 'baby_20', name: 'Rattle', description: 'Discovered the magic of noise!', imagePath: '/lovable-uploads/a89a35b0-c795-4b5f-8146-14d684fb0a6c.png', unlockStars: 20 },
  { id: 'baby_30', name: 'Baby bottle', description: 'Powered up with milk!', imagePath: '/lovable-uploads/67fd4f22-029b-4315-a953-8e1d13d8fa8a.png', unlockStars: 30 },
  { id: 'baby_40', name: 'Teddy bear', description: 'Found a forever cuddle buddy!', imagePath: '/lovable-uploads/aed5f14f-96ed-45c0-82d7-5c8f14791103.png', unlockStars: 40 },
];

export const CHILD_STAGE_BADGES: Badge[] = [
  { id: 'child_60', name: 'Toy blocks', description: 'Built a masterpiece (and knocked it down)!', imagePath: '/lovable-uploads/ff092de3-9ad2-4267-8fac-5090db8e282d.png', unlockStars: 60 },
  { id: 'child_70', name: 'Tooth', description: 'Oops! First tooth is missing!', imagePath: '/lovable-uploads/dab249a7-b66a-4fe9-9115-5a19c4642fd1.png', unlockStars: 70 },
  { id: 'child_80', name: 'Crayon', description: 'Walls are the best canvas!', imagePath: '/lovable-uploads/6eae4e46-e3c2-43b6-b536-71e12a45acdb.png', unlockStars: 80 },
  { id: 'child_90', name: 'Soccer ball', description: 'Scored the first goal (in the wrong net)!', imagePath: '/lovable-uploads/03fed6c5-25e4-4a07-9b9f-df555d8f325d.png', unlockStars: 90 },
  { id: 'child_100', name: 'Backpack', description: 'Ready for the first big school adventure!', imagePath: '/lovable-uploads/fe5971cc-b04b-44f2-aea4-2dd82a25fe0d.png', unlockStars: 100 },
  { id: 'child_110', name: 'Ice cream', description: 'Life lesson: ice cream melts fast!', imagePath: '/lovable-uploads/005a577e-5920-44f1-8876-89e01675ad5c.png', unlockStars: 110 },
  { id: 'child_120', name: 'Jump rope', description: 'Can finally jump 10 times without tripping!', imagePath: '/lovable-uploads/058e2ce0-633d-4ad3-aeba-d61b6332aa19.png', unlockStars: 120 },
  { id: 'child_130', name: 'Gold star', description: 'Teacher says: "Great job!"', imagePath: '/lovable-uploads/7f4a0d87-a2fc-4df7-8144-da15a08e4194.png', unlockStars: 130 },
  { id: 'child_140', name: 'Book', description: 'Reading fairy tales past bedtime…', imagePath: '/lovable-uploads/a1851bf5-1dbe-4da4-b6c4-b70741a2419a.png', unlockStars: 140 },
  { id: 'child_150', name: 'Birthday hat', description: 'The biggest cake ever—gone in 5 minutes!', imagePath: '/lovable-uploads/198ca6cb-290d-49df-9926-353647ad1a40.png', unlockStars: 150 },
  { id: 'child_160', name: 'Scooter', description: 'Zooming faster than grown-ups can run!', imagePath: '/lovable-uploads/9702510b-4738-46ef-94d9-c20f149e4344.png', unlockStars: 160 },
  { id: 'child_170', name: 'Puppy paw', description: 'Best friends forever: me and the dog!', imagePath: '/lovable-uploads/2ac1890f-77c2-4195-8200-ec5d6ff2d1a3.png', unlockStars: 170 },
  { id: 'child_180', name: 'Sunglasses', description: 'Cool kid alert!', imagePath: '/lovable-uploads/768ca657-2280-4d4a-a344-91ccb3000cd9.png', unlockStars: 180 },
  { id: 'child_190', name: 'Puzzle piece', description: 'Finished a puzzle without losing any pieces (miracle)!', imagePath: '/lovable-uploads/01f53541-5c59-48e9-b19c-cd1066d62356.png', unlockStars: 190 },
];

export const TEENAGER_STAGE_BADGES: Badge[] = [
  { id: 'teen_210', name: 'Smartphone', description: 'Texting speed: Olympic level.', imagePath: '/lovable-uploads/d9af1fd8-c088-4940-8410-e7b8981deb9b.png', unlockStars: 210 },
  { id: 'teen_220', name: 'Guitar', description: 'First band, terrible name.', imagePath: '/lovable-uploads/9392bfd2-c55b-4cc3-bdaf-8a117f182274.png', unlockStars: 220 },
  { id: 'teen_230', name: 'Pizza slice', description: 'Dinner of champions.', imagePath: '/lovable-uploads/75effe2f-5f6d-4975-9bcd-ec26cc1b1d90.png', unlockStars: 230 },
  { id: 'teen_240', name: 'Schoolbook', description: 'Crammed a month into one night.', imagePath: '/lovable-uploads/3d6998d1-2fa7-44cb-819e-4d16274fae69.png', unlockStars: 240 },
  { id: 'teen_250', name: 'Heart', description: 'First crush. Blushing nonstop.', imagePath: '/lovable-uploads/91d1d5e8-aa50-4224-8bc0-bc3c41bfa3d7.png', unlockStars: 250 },
  { id: 'teen_260', name: 'Headphones', description: 'Music = life.', imagePath: '/lovable-uploads/138754aa-4e4b-4693-845a-b9dc1ebf8547.png', unlockStars: 260 },
  { id: 'teen_270', name: 'Basketball', description: 'Scored once, brags forever.', imagePath: '/lovable-uploads/d4f065ef-235e-437d-91ca-bdcbd0bcd955.png', unlockStars: 270 },
  { id: 'teen_280', name: 'Skateboard', description: 'Gravity hurts, but worth it.', imagePath: '/lovable-uploads/ffca028a-639a-4670-870c-7eb7b44eb6ec.png', unlockStars: 280 },
  { id: 'teen_290', name: 'Selfie camera', description: 'Perfect angle = 200 tries.', imagePath: '/lovable-uploads/1d47abc5-2d6b-4364-b8d5-ab4288acb6bf.png', unlockStars: 290 },
  { id: 'teen_300', name: 'Exam paper', description: 'Passed! Don\'t ask how.', imagePath: '/lovable-uploads/9d13b2bb-6443-4e88-b132-6b46e2624c62.png', unlockStars: 300 },
  { id: 'teen_310', name: 'Hoodie', description: 'Uniform: hoodie 24/7.', imagePath: '/lovable-uploads/331d093c-77bc-4176-87f6-af9c6762f0bb.png', unlockStars: 310 },
  { id: 'teen_320', name: 'Drama mask', description: 'Teen drama: everywhere, always.', imagePath: '/lovable-uploads/7e4bbc8c-4ef3-467d-8ff8-992fde1b0420.png', unlockStars: 320 },
  { id: 'teen_330', name: 'Notebook', description: 'Secret diary… don\'t peek!', imagePath: '/lovable-uploads/bf3966b5-6f43-4141-a078-39c2940d132f.png', unlockStars: 330 },
  { id: 'teen_340', name: 'Bike', description: 'Faster than the bus, cooler too.', imagePath: '/lovable-uploads/adc6b6fc-7cd2-41a8-9939-3d24d1f3673f.png', unlockStars: 340 },
];

export const PLACEHOLDER_BADGES: Badge[] = [
  { id: 'stars_10', name: 'First Steps', description: 'Earned your first 10 stars!', imagePath: '/placeholder-badge.png', unlockStars: 10 },
  { id: 'stars_20', name: 'Building Momentum', description: 'Reached 20 stars!', imagePath: '/placeholder-badge.png', unlockStars: 20 },
  { id: 'stars_30', name: 'On Fire', description: 'Amazing! 30 stars earned!', imagePath: '/placeholder-badge.png', unlockStars: 30 },
];