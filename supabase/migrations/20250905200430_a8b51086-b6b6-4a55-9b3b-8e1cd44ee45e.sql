-- Clear incorrect data first
DELETE FROM public.badges;
DELETE FROM public.character_stages;

-- Insert correct character stages from constants
INSERT INTO public.character_stages (stage, required_stars, name) VALUES
(0, 0, 'Baby'),
(50, 50, 'Child'),
(200, 200, 'Teen'),
(350, 350, 'Young Adult'),
(500, 500, 'On the Rise'),
(600, 600, 'Adult'),
(700, 700, 'Mature Adult'),
(800, 800, 'Golden Chapter'),
(1000, 1000, 'Elder')
ON CONFLICT (stage) DO NOTHING;

-- Insert all badges from constants with correct stage mappings

-- Baby Stage Badges (stage 0: 0-49 stars)
INSERT INTO public.badges (id, name, description, image_path, unlock_stars, stage) VALUES
('baby_10', 'Pacifier', 'First smile melts everyone''s heart!', '/lovable-uploads/13216a33-9e76-4183-9b6e-781601ca3eb6.png', 10, 0),
('baby_20', 'Rattle', 'Discovered the magic of noise!', '/lovable-uploads/a89a35b0-c795-4b5f-8146-14d684fb0a6c.png', 20, 0),
('baby_30', 'Baby bottle', 'Powered up with milk!', '/lovable-uploads/67fd4f22-029b-4315-a953-8e1d13d8fa8a.png', 30, 0),
('baby_40', 'Teddy bear', 'Found a forever cuddle buddy!', '/lovable-uploads/aed5f14f-96ed-45c0-82d7-5c8f14791103.png', 40, 0),

-- Child Stage Badges (stage 50: 50-199 stars)
('child_60', 'Toy blocks', 'Built a masterpiece (and knocked it down)!', '/lovable-uploads/ff092de3-9ad2-4267-8fac-5090db8e282d.png', 60, 50),
('child_70', 'Tooth', 'Oops! First tooth is missing!', '/lovable-uploads/dab249a7-b66a-4fe9-9115-5a19c4642fd1.png', 70, 50),
('child_80', 'Crayon', 'Walls are the best canvas!', '/lovable-uploads/6eae4e46-e3c2-43b6-b536-71e12a45acdb.png', 80, 50),
('child_90', 'Soccer ball', 'Scored the first goal (in the wrong net)!', '/lovable-uploads/03fed6c5-25e4-4a07-9b9f-df555d8f325d.png', 90, 50),
('child_100', 'Backpack', 'Ready for the first big school adventure!', '/lovable-uploads/fe5971cc-b04b-44f2-aea4-2dd82a25fe0d.png', 100, 50),
('child_110', 'Ice cream', 'Life lesson: ice cream melts fast!', '/lovable-uploads/005a577e-5920-44f1-8876-89e01675ad5c.png', 110, 50),
('child_120', 'Jump rope', 'Can finally jump 10 times without tripping!', '/lovable-uploads/058e2ce0-633d-4ad3-aeba-d61b6332aa19.png', 120, 50),
('child_130', 'Gold star', 'Teacher says: "Great job!"', '/lovable-uploads/7f4a0d87-a2fc-4df7-8144-da15a08e4194.png', 130, 50),
('child_140', 'Book', 'Reading fairy tales past bedtime…', '/lovable-uploads/a1851bf5-1dbe-4da4-b6c4-b70741a2419a.png', 140, 50),
('child_150', 'Birthday hat', 'The biggest cake ever—gone in 5 minutes!', '/lovable-uploads/198ca6cb-290d-49df-9926-353647ad1a40.png', 150, 50),
('child_160', 'Scooter', 'Zooming faster than grown-ups can run!', '/lovable-uploads/9702510b-4738-46ef-94d9-c20f149e4344.png', 160, 50),
('child_170', 'Puppy paw', 'Best friends forever: me and the dog!', '/lovable-uploads/2ac1890f-77c2-4195-8200-ec5d6ff2d1a3.png', 170, 50),
('child_180', 'Sunglasses', 'Cool kid alert!', '/lovable-uploads/768ca657-2280-4d4a-a344-91ccb3000cd9.png', 180, 50),
('child_190', 'Puzzle piece', 'Finished a puzzle without losing any pieces (miracle)!', '/lovable-uploads/01f53541-5c59-48e9-b19c-cd1066d62356.png', 190, 50),

-- Teenager Stage Badges (stage 200: 200-349 stars)
('teen_210', 'Smartphone', 'Texting speed: Olympic level.', '/lovable-uploads/d9af1fd8-c088-4940-8410-e7b8981deb9b.png', 210, 200),
('teen_220', 'Guitar', 'First band, terrible name.', '/lovable-uploads/9392bfd2-c55b-4cc3-bdaf-8a117f182274.png', 220, 200),
('teen_230', 'Pizza slice', 'Dinner of champions.', '/lovable-uploads/75effe2f-5f6d-4975-9bcd-ec26cc1b1d90.png', 230, 200),
('teen_240', 'Schoolbook', 'Crammed a month into one night.', '/lovable-uploads/3d6998d1-2fa7-44cb-819e-4d16274fae69.png', 240, 200),
('teen_250', 'Heart', 'First crush. Blushing nonstop.', '/lovable-uploads/91d1d5e8-aa50-4224-8bc0-bc3c41bfa3d7.png', 250, 200),
('teen_260', 'Headphones', 'Music = life.', '/lovable-uploads/138754aa-4e4b-4693-845a-b9dc1ebf8547.png', 260, 200),
('teen_270', 'Basketball', 'Scored once, brags forever.', '/lovable-uploads/d4f065ef-235e-437d-91ca-bdcbd0bcd955.png', 270, 200),
('teen_280', 'Skateboard', 'Gravity hurts, but worth it.', '/lovable-uploads/ffca028a-639a-4670-870c-7eb7b44eb6ec.png', 280, 200),
('teen_290', 'Selfie camera', 'Perfect angle = 200 tries.', '/lovable-uploads/1d47abc5-2d6b-4364-b8d5-ab4288acb6bf.png', 290, 200),
('teen_300', 'Exam paper', 'Passed! Don''t ask how.', '/lovable-uploads/9d13b2bb-6443-4e88-b132-6b46e2624c62.png', 300, 200),
('teen_310', 'Hoodie', 'Uniform: hoodie 24/7.', '/lovable-uploads/331d093c-77bc-4176-87f6-af9c6762f0bb.png', 310, 200),
('teen_320', 'Drama mask', 'Teen drama: everywhere, always.', '/lovable-uploads/7e4bbc8c-4ef3-467d-8ff8-992fde1b0420.png', 320, 200),
('teen_330', 'Notebook', 'Secret diary… don''t peek!', '/lovable-uploads/bf3966b5-6f43-4141-a078-39c2940d132f.png', 330, 200),
('teen_340', 'Bike', 'Faster than the bus, cooler too.', '/lovable-uploads/adc6b6fc-7cd2-41a8-9939-3d24d1f3673f.png', 340, 200),

-- Young Adult Stage Badges (stage 350: 350-499 stars)
('adult_360', 'Serving Tray', 'Carried 5 cups, spilled 4.', '/lovable-uploads/72996e2e-5de5-419d-b5fd-77c2d00474bc.png', 360, 350),
('adult_370', 'Coffee Mug', 'Survival fuel unlocked.', '/lovable-uploads/32cc6920-8bfb-4f76-bdaa-f96013b3bd9e.png', 370, 350),
('adult_380', 'Wall Clock', 'Discovered Mondays are eternal.', '/lovable-uploads/986ad6f0-4ddf-4078-ab5b-1e065879241b.png', 380, 350),
('adult_390', 'Work Uniform', 'First paycheck = instant shopping spree.', '/lovable-uploads/95f30d91-0887-4db7-950c-99dde093c805.png', 390, 350),
('adult_400', 'Keyboard', 'Typing fast looks like hacking.', '/lovable-uploads/ab55874b-4314-464f-be06-47fb87016cc7.png', 400, 350),
('adult_410', 'Phone', 'Customer: angry. Me: smiling.', '/lovable-uploads/912bede5-3ef8-459b-add6-8adaee4acc57.png', 410, 350),
('adult_420', 'Work Shoes', 'Work shoes = torture devices.', '/lovable-uploads/23be9de9-fb1f-49b0-8481-8d3b38919bc5.png', 420, 350),
('adult_430', 'Wallet', 'Savings? What savings?', '/lovable-uploads/94430fc5-9664-41fd-9099-ffa94f95d67b.png', 430, 350),
('adult_440', 'Tie', 'Tied a tie after 50 YouTube tutorials.', '/lovable-uploads/e299ad47-a622-4d21-92e6-1a62b8b44ccb.png', 440, 350),
('adult_450', 'Laptop', 'Ctrl+Z is my superpower.', '/lovable-uploads/e2fd2477-68aa-423b-9ad2-e465091b0352.png', 450, 350),
('adult_460', 'Pizza Box', 'Midnight shift snack tradition.', '/lovable-uploads/ae803100-f459-45af-99b8-f59d2605e7f5.png', 460, 350),
('adult_470', 'Coin', 'Learned what "taxes" mean (ouch).', '/lovable-uploads/0bd291fd-7bf1-4bb1-a9cc-1973757bf757.png', 470, 350),
('adult_480', 'Alarm Clock', 'Alarm ignored = boss angry.', '/lovable-uploads/69719e36-ebeb-468a-ae91-e8d5ee6cc929.png', 480, 350),
('adult_490', 'Credit Card', 'Credit card balance: nope.', '/lovable-uploads/2f5c34ad-8ee4-437d-8d5c-a604342cb611.png', 490, 350),

-- On the Rise Stage Badges (stage 500: 500-599 stars)
('ontherise_510', 'Compass', 'Found a career direction that feels right.', '/lovable-uploads/cf20bfed-2630-4ef8-b559-9c0d74b2f50d.png', 510, 500),
('ontherise_520', 'Portfolio', 'Your work finally looks like you.', '/lovable-uploads/8eb0b8df-4352-4e5c-9d70-a195aa74dbc4.png', 520, 500),
('ontherise_530', 'Wardrobe', 'Signature style unlocked.', '/lovable-uploads/e1fdc189-0e84-45b3-ac33-01a11a3f4f01.png', 530, 500),
('ontherise_540', 'Palate', 'Taste upgraded—food, music, everything.', '/lovable-uploads/9b069300-3c2a-48ce-90c5-55a898aef9b9.png', 540, 500),
('ontherise_550', 'Date Night', 'Left on read? Not tonight.', '/lovable-uploads/490612e3-5e31-44de-9702-2b211c6c7132.png', 550, 500),
('ontherise_560', 'Duo', 'Found your person to high-five wins with.', '/lovable-uploads/0bdb018c-d948-4714-954e-f5b2fc8689c5.png', 560, 500),
('ontherise_570', 'Mentor', 'Helping others level up.', '/lovable-uploads/bd66e4f3-2004-41a6-99e8-3a2f7440e2df.png', 570, 500),
('ontherise_580', 'Raise', 'Paycheck up. Confidence too.', '/lovable-uploads/71c3b5b5-9781-4042-b774-82bdf23af465.png', 580, 500),
('ontherise_590', 'Lanyard', 'Conference conquered; contacts gained.', '/lovable-uploads/205da4e2-4de0-4832-9e5a-c29e3ea95695.png', 590, 500),

-- Adult Stage Badges (stage 600: 600-699 stars)
('adult_610', 'Car Key', 'Freedom on four wheels!', '/lovable-uploads/84a3af57-d78a-4849-b96c-420957685334.png', 610, 600),
('adult_620', 'House', 'Rented, but feels like mine.', '/lovable-uploads/f28b64ba-1e9d-47a4-9ae4-c7f5816fdda9.png', 620, 600),
('adult_630', 'Baby Stroller', 'Life: upgraded with mini-me.', '/lovable-uploads/e6af9500-8f81-4d6a-88eb-fc730add506b.png', 630, 600),
('adult_640', 'Bills', 'Electricity bill = horror story.', '/lovable-uploads/1e70494b-88c3-4ee7-8c4f-8e11e658a16c.png', 640, 600),
('adult_650', 'Plant', 'House plant survived a whole week!', '/lovable-uploads/d9073a03-941c-4b6c-942f-463e9fb8f69d.png', 650, 600),
('adult_660', 'Ring', 'Love, commitment… and dishes.', '/lovable-uploads/8e6b2921-90a1-4b46-8711-0a450256a4fc.png', 660, 600),
('adult_670', 'Book', 'Self-help library: growing fast.', '/lovable-uploads/b3254e9a-a633-4e58-a09c-302816885ada.png', 670, 600),
('adult_680', 'Suitcase', 'Business trip = free hotel breakfast.', '/lovable-uploads/0ee79d38-3065-4e43-adb5-60af0bbc85f8.png', 680, 600),
('adult_690', 'Laptop', 'Emails never end.', '/lovable-uploads/e767c617-c3fc-4b7f-81b3-645cda474871.png', 690, 600),

-- Mature Adult Stage Badges (stage 700: 700-799 stars)
('mature_adult_couch', 'Couch', 'Netflix marathon champion.', '/lovable-uploads/c30889e1-e45f-400a-a03e-5ad09eabe7ca.png', 710, 700),
('mature_adult_dumbbell', 'Gym Dumbbell', 'Signed up… went twice.', '/lovable-uploads/56aca36c-3e9f-4c17-9f0e-88fc2f36a0ac.png', 720, 700),
('mature_adult_camera', 'Camera', 'Vacation photos: 1000, good ones: 3.', '/lovable-uploads/7c436b25-2776-479f-82e5-dafd0f0da6a0.png', 730, 700),
('mature_adult_money_bag', 'Money Bag', 'Finally some savings!', '/lovable-uploads/2c5340fc-121a-48e9-bc55-c60bcda849cf.png', 740, 700),
('mature_adult_balloon', 'Balloon', 'Threw a party, neighbors complained.', '/lovable-uploads/9740a3d8-1664-457b-80a2-0e9caad66358.png', 750, 700),
('mature_adult_wine_glass', 'Wine Glass', 'Wine tasting: totally professional.', '/lovable-uploads/e4377652-99b4-4ddc-834e-3d873e8d2b27.png', 760, 700),
('mature_adult_toolbox', 'Toolbox', 'Fixed one thing, broke two.', '/lovable-uploads/3362f7c3-7a5f-4a77-bc7a-4aaba94948f0.png', 770, 700),
('mature_adult_graduation_cap', 'Graduation Cap', 'Finally finished that degree.', '/lovable-uploads/115741fb-ad8e-4c19-9918-d5225f01c19c.png', 780, 700),
('mature_adult_globe', 'Globe', 'Traveled the world (or at least 2 cities).', '/lovable-uploads/94c2e039-882b-4890-9173-1e7555ed04c0.png', 790, 700),

-- Golden Chapter Stage Badges (stage 800: 800-999 stars)
('golden_gray_hair', 'Gray Hair Strand', 'New highlight: natural silver.', '/lovable-uploads/5f05b3f0-1fe9-4b28-b625-b564ee36503e.png', 810, 800),
('golden_glasses', 'Glasses', 'Reading tiny text = impossible.', '/lovable-uploads/1b22504a-6efe-40e3-89ce-e98c105c951e.png', 820, 800),
('golden_book_stack', 'Book Stack', 'Wisdom collection complete.', '/lovable-uploads/65e8023c-2acb-4318-9110-9d01b10da4e8.png', 830, 800),
('golden_bbq_grill', 'BBQ Grill', 'Neighborhood''s grill king.', '/lovable-uploads/60d3d2b8-91b9-4f65-abbc-2d3b96feeb1b.png', 840, 800),
('golden_yacht_model', 'Yacht Model', 'Dream big, sail small.', '/lovable-uploads/4ae59293-f478-4a70-861c-88670d84a3a4.png', 850, 800),
('golden_family_photo', 'Family Photo', 'Best crew ever.', '/lovable-uploads/36b7445a-3f95-4cdc-9c7c-61e81733e137.png', 860, 800),
('golden_golf_club', 'Golf Club', 'Hole in… 23 tries.', '/lovable-uploads/ee0e8bfd-8cd1-4c25-8f92-a779667f9e1b.png', 870, 800),
('golden_desk', 'Desk', 'Office is second home.', '/lovable-uploads/31ebd777-bffc-4065-9955-d702c93fe9b3.png', 880, 800),
('golden_trophy', 'Trophy', 'Midlife = prime time!', '/lovable-uploads/186659d3-5246-4729-9e99-2f0054c0c52c.png', 890, 800),
('golden_rocking_chair', 'Rocking Chair', 'Weekend nap champion.', '/lovable-uploads/c4b79177-9a80-405d-99d6-b3ad6c3bc089.png', 900, 800),
('golden_cookbook', 'Cookbook', 'Secret recipe perfected.', '/lovable-uploads/9ac9cd36-c6c1-4322-8aaa-379755f2105e.png', 910, 800),
('golden_hiking_stick', 'Hiking Stick', 'Mountains still call.', '/lovable-uploads/640c6f87-bba4-4fb9-9d66-40d4e05e746f.png', 920, 800),
('golden_headphones', 'Headphones', 'Old but still rockin''!', '/lovable-uploads/9f75f10b-15c6-43d1-a169-bc91d37454d2.png', 930, 800),
('golden_piggy_bank', 'Piggy Bank', 'Savings plan: finally working.', '/lovable-uploads/3146ffc4-733a-41b3-ba18-15df70eb6cdf.png', 940, 800),
('golden_medal', 'Medal', 'Lifetime achievement unlocked.', '/lovable-uploads/89b6d0ce-d747-4ee6-a1c4-7a0521b5ab47.png', 950, 800),
('golden_dog_paw', 'Dog Paw', 'Dog still thinks I''m the best.', '/lovable-uploads/cf7ee777-52b2-4546-b2e4-22b6ca201496.png', 960, 800),
('golden_camera', 'Camera', 'Every wrinkle tells a story.', '/lovable-uploads/30c6036b-c554-479a-956b-6349cc90c575.png', 970, 800),
('golden_calendar', 'Calendar', 'Birthday parties never stop.', '/lovable-uploads/044ac21a-556d-4366-bcf5-4a5b29682f65.png', 980, 800),
('golden_champagne', 'Champagne', 'Cheers to the best years!', '/lovable-uploads/74c56a2a-31e6-452b-ae6d-5f036ced7c9b.png', 990, 800)

ON CONFLICT (id) DO NOTHING;

-- Update task templates for default house chores with corrected star values
UPDATE task_templates SET star_value = 3 WHERE name = 'Clean the room' AND is_default = true;
UPDATE task_templates SET star_value = 3 WHERE name = 'Do the dishes' AND is_default = true; 
UPDATE task_templates SET star_value = 2 WHERE name = 'Take out trash' AND is_default = true;
UPDATE task_templates SET star_value = 3 WHERE name = 'Cook meal' AND is_default = true;