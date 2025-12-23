-- Seed default Chameleon word lists

-- Insert Animals word list
INSERT INTO chameleon_word_lists (name, filename, description, is_default)
VALUES ('Animals', 'animals', 'Common animal names for Chameleon', true)
ON CONFLICT (name) DO NOTHING;

-- Insert animals
INSERT INTO chameleon_words (word_list_id, word)
SELECT
  (SELECT id FROM chameleon_word_lists WHERE filename = 'animals') as list_id,
  word
FROM (VALUES
  ('Lion'), ('Tiger'), ('Elephant'), ('Giraffe'), ('Zebra'),
  ('Monkey'), ('Bear'), ('Penguin'), ('Eagle'), ('Shark'),
  ('Dolphin'), ('Whale'), ('Kangaroo'), ('Panda'), ('Owl'),
  ('Snake'), ('Cheetah'), ('Rhino'), ('Hippopotamus'), ('Crocodile')
) AS words(word)
ON CONFLICT (word_list_id, word) DO NOTHING;

-- Insert Food word list
INSERT INTO chameleon_word_lists (name, filename, description, is_default)
VALUES ('Food', 'food', 'Common food and drink items for Chameleon', true)
ON CONFLICT (name) DO NOTHING;

-- Insert food items
INSERT INTO chameleon_words (word_list_id, word)
SELECT
  (SELECT id FROM chameleon_word_lists WHERE filename = 'food') as list_id,
  word
FROM (VALUES
  ('Apple'), ('Banana'), ('Pizza'), ('Burger'), ('Spaghetti'),
  ('Sushi'), ('Chocolate'), ('Ice Cream'), ('Coffee'), ('Sandwich'),
  ('Tacos'), ('Donut'), ('Broccoli'), ('Carrot'), ('Cheese'),
  ('Salmon'), ('Rice'), ('Pasta'), ('Cake'), ('Cookies')
) AS words(word)
ON CONFLICT (word_list_id, word) DO NOTHING;

-- Insert Sports word list
INSERT INTO chameleon_word_lists (name, filename, description, is_default)
VALUES ('Sports', 'sports', 'Sports and athletic activities for Chameleon', true)
ON CONFLICT (name) DO NOTHING;

-- Insert sports items
INSERT INTO chameleon_words (word_list_id, word)
SELECT
  (SELECT id FROM chameleon_word_lists WHERE filename = 'sports') as list_id,
  word
FROM (VALUES
  ('Soccer'), ('Basketball'), ('Tennis'), ('Swimming'), ('Running'),
  ('Cycling'), ('Skiing'), ('Surfing'), ('Boxing'), ('Golf'),
  ('Cricket'), ('Baseball'), ('Volleyball'), ('Bowling'), ('Hockey'),
  ('Rugby'), ('Wrestling'), ('Gymnastics'), ('Skateboarding'), ('Climbing')
) AS words(word)
ON CONFLICT (word_list_id, word) DO NOTHING;

-- Insert Vehicles word list
INSERT INTO chameleon_word_lists (name, filename, description, is_default)
VALUES ('Vehicles', 'vehicles', 'Transportation and vehicles for Chameleon', true)
ON CONFLICT (name) DO NOTHING;

-- Insert vehicle items
INSERT INTO chameleon_words (word_list_id, word)
SELECT
  (SELECT id FROM chameleon_word_lists WHERE filename = 'vehicles') as list_id,
  word
FROM (VALUES
  ('Car'), ('Bicycle'), ('Train'), ('Airplane'), ('Boat'),
  ('Helicopter'), ('Motorcycle'), ('Bus'), ('Truck'), ('Submarine'),
  ('Rocket'), ('Skateboard'), ('Scooter'), ('Wagon'), ('Canoe'),
  ('Ambulance'), ('Police Car'), ('Fire Truck'), ('Hot Air Balloon'), ('Jet')
) AS words(word)
ON CONFLICT (word_list_id, word) DO NOTHING;

-- Insert Countries word list
INSERT INTO chameleon_word_lists (name, filename, description, is_default)
VALUES ('Countries', 'countries', 'Country names for Chameleon', true)
ON CONFLICT (name) DO NOTHING;

-- Insert country items
INSERT INTO chameleon_words (word_list_id, word)
SELECT
  (SELECT id FROM chameleon_word_lists WHERE filename = 'countries') as list_id,
  word
FROM (VALUES
  ('Japan'), ('Brazil'), ('France'), ('Australia'), ('Canada'),
  ('India'), ('Mexico'), ('Egypt'), ('Greece'), ('Italy'),
  ('Spain'), ('Germany'), ('Russia'), ('China'), ('United States'),
  ('Thailand'), ('Norway'), ('New Zealand'), ('South Korea'), ('Ireland')
) AS words(word)
ON CONFLICT (word_list_id, word) DO NOTHING;
