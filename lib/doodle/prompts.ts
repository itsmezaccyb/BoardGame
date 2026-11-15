/** Word categories the leader can pick from. Things fun to draw badly and fun to misread. */
export interface PromptCategory {
  id: string;
  name: string;
  emoji: string;
  prompts: readonly string[];
}

export const CATEGORIES: readonly PromptCategory[] = [
  {
    id: 'animals',
    name: 'Animals',
    emoji: '🐾',
    prompts: [
      'Cat riding a skateboard', 'Dog in a tuxedo', 'Penguin on vacation', 'Shark at the dentist',
      'Giraffe in a turtleneck', 'Octopus juggling', 'Snail in a race', 'Owl reading a book',
      'Bear eating pancakes', 'Frog prince', 'Goldfish in a submarine', 'Duck with sunglasses',
      'Horse on a trampoline', 'Llama at the beach', 'Elephant hiding behind a tree', 'Bat hanging out',
      'Kangaroo boxing', 'Pig in mud', 'Spider knitting', 'Squirrel stealing pizza',
    ],
  },
  {
    id: 'places',
    name: 'Places & things',
    emoji: '🏰',
    prompts: [
      'Haunted house', 'Treasure map', 'Lighthouse', 'Volcano erupting', 'Igloo', 'Castle drawbridge',
      'Hot air balloon', 'Roller coaster', 'Message in a bottle', 'Snow globe', 'Lava lamp',
      'Grandfather clock', 'Vending machine', 'Traffic jam', 'Desert island', 'Tree house', 'Campfire',
      'Rocket launch', 'Ferris wheel', 'Water slide', 'Shipwreck', 'Bowling alley',
    ],
  },
  {
    id: 'people',
    name: 'People & jobs',
    emoji: '🧑‍🚀',
    prompts: [
      'Astronaut', 'Pirate captain', 'Mad scientist', 'Lifeguard', 'Magician', 'Ninja', 'Cowboy', 'Mermaid',
      'Chef', 'Firefighter', 'Robot butler', 'Superhero landing', 'Knight in armor', 'Mummy',
      'Vampire at brunch', 'Zombie dance party', 'Wizard duel', 'Ballerina', 'DJ', 'Mime trapped in a box',
      'Sleepy security guard',
    ],
  },
  {
    id: 'situations',
    name: 'Situations',
    emoji: '😬',
    prompts: [
      'Brain freeze', 'Bad hair day', 'Stuck in an elevator', 'Missing the bus', 'Sunburn', 'Food fight',
      'Pillow fort', 'Sneezing', 'Sleepwalking', 'Tug of war', 'Hide and seek', 'Spilled coffee',
      'Lost luggage', 'Snowball fight', 'Thunderstorm', 'Rainbow', 'Surprise party', 'First day of school',
      'Monday morning', 'Locked out of the house', 'Running late', 'Moon landing', 'Lightning strike',
      'Falling asleep in class',
    ],
  },
  {
    id: 'food',
    name: 'Food',
    emoji: '🍕',
    prompts: [
      'Pizza delivery', 'Melting ice cream', 'Spaghetti and meatballs', 'Hot dog stand', 'Birthday cake',
      'Burnt toast', 'Popcorn', 'Taco Tuesday', 'Breakfast in bed', 'Gingerbread house', 'Lemonade stand',
      'Sushi', 'Corn dog', 'Exploding microwave', 'Pancake stack', 'Fruit salad', 'Cotton candy',
      'Chili cook-off', 'Soup of the day', 'Barbecue',
    ],
  },
  {
    id: 'sayings',
    name: 'Sayings',
    emoji: '💬',
    prompts: [
      'Couch potato', 'Night owl', 'Cold feet', 'Piece of cake', 'Raining cats and dogs',
      'Elephant in the room', 'Butterflies in your stomach', 'Head in the clouds', 'Hot potato', 'Early bird',
      'Under the weather', 'Time flies', 'Spill the beans', 'Big cheese', 'Walking on eggshells', 'Busy bee',
      'Love birds', 'Bookworm',
    ],
  },
  {
    id: 'weird',
    name: 'Weird combos',
    emoji: '🦄',
    prompts: [
      'Dinosaur at a birthday party', 'Alien grocery shopping', 'Ghost doing laundry', 'Unicorn traffic cop',
      'Dragon roasting marshmallows', 'Yeti on a surfboard', 'Robot in love', 'Toaster with feelings',
      'Banana phone', 'Sock monster', 'Tornado of cats', 'Cloud raining spaghetti', 'Haunted toilet',
      'Sumo wrestler on ice', 'Grandma on a motorcycle', 'Baby running a business', 'Pumpkin with a mustache',
      'Snowman in summer', 'Cactus hug', 'Lonely sock in the dryer',
    ],
  },
  {
    id: 'sports',
    name: 'Sports & hobbies',
    emoji: '⚽',
    prompts: [
      'Slam dunk', 'Hole in one', 'Belly flop', 'Marathon finish', 'Skydiving', 'Fishing trip', 'Ice skating',
      'Karate chop', 'Bowling strike', 'Rock climbing', 'Yoga pose', 'Gardening', 'Knitting', 'Bird watching',
      'Surfing a big wave', 'Video game rage', 'Juggling', 'Camping', 'Chess match', 'Tightrope walk',
    ],
  },
  {
    id: 'holidays',
    name: 'Holidays',
    emoji: '🎉',
    prompts: [
      'Trick or treat', 'Carving a pumpkin', 'New Year fireworks', 'Easter egg hunt', 'Turkey dinner',
      'Decorating the tree', 'Opening presents', 'Valentine card', 'Fourth of July picnic', 'Snow day',
      'Birthday candles', 'Hanging stockings', 'Costume party', 'Building a snowman', 'Wedding cake',
      'Graduation cap', 'Summer vacation', 'Pinata', 'Sleigh ride', 'Gingerbread man',
    ],
  },
  {
    id: 'stories',
    name: 'Fairy tales',
    emoji: '📖',
    prompts: [
      'Three little pigs', 'Big bad wolf', 'Glass slipper', 'Sleeping beauty', 'Magic beanstalk',
      'Frog prince', 'Gingerbread house in the woods', 'Pied piper', 'Golden goose', 'Genie in a lamp',
      'Mermaid on a rock', 'Dragon guarding gold', 'Wishing well', 'Flying carpet', 'Troll under the bridge',
      'Princess and the pea', 'Tortoise and the hare', 'Ugly duckling', 'Fairy godmother', 'Poisoned apple',
    ],
  },
];

export const ALL_CATEGORY_IDS = CATEGORIES.map((c) => c.id);

/** Every prompt in the chosen categories (all categories if none are valid), without duplicates. */
export function promptsFor(categoryIds: readonly string[] | undefined): string[] {
  const chosen = CATEGORIES.filter((c) => categoryIds?.includes(c.id));
  const source = chosen.length ? chosen : CATEGORIES;
  return Array.from(new Set(source.flatMap((c) => c.prompts)));
}
