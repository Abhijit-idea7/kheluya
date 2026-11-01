/*
  The seven quick-win puzzle types (from the "Simpler non-word puzzle formats" set), created if missing
  and marked quick. Existing types with these web names are only marked quick; their texts are kept.
*/
insert into public.puzzle_types (slug, name_mr, name_en, about_mr, about_en, tile, sort_order, is_quick) values
  ('jodya-lava',  'जोड्या लावा',        'Match the Pairs',      'सण आणि त्याचा खास पदार्थ — जोड्या जुळवा.',                 'Match festivals with their special food or custom.',           'जो', 110, true),
  ('patte-jodi',  'पत्ते जोडी',         'Card Pairs',           'पत्ते उलटा आणि सहा जोड्या शोधा.',                         'Flip the cards and find the six pairs.',                         'प',  120, true),
  ('kram-lava',   'आधी काय, नंतर काय?', 'What Came First?',     'घटना सर्वात जुनी आधी, अशा क्रमाने लावा.',                  'Put the events in order, oldest first.',                         'आ',  130, true),
  ('pharak-olkha','फरक ओळखा',           'Spot the Difference',  'दोन चित्रांमधील पाच फरक शोधा.',                           'Find five differences between two pictures.',                    'फ',  140, true),
  ('rangoli',     'रांगोळी पूर्ण करा',     'Complete the Rangoli', 'अर्धी रांगोळी आरशासारखी पूर्ण करा.',                     'Complete the other half of the rangoli as its mirror image.',    'रां', 150, true),
  ('he-kay-bara', 'हे काय बरं?',         'What Is This?',        'अगदी जवळून दाखवलेली ओळखीची वस्तू ओळखा.',                'Guess the familiar object from a close-up.',                     'हे', 160, true),
  ('saap-shidi',  'साप-शिडी',            'Snakes and Ladders',   'बरोबर उत्तर दिले की शिडी चढा, सापापासून वाचा.',               'Right answers climb ladders and save you from snakes.',          'सा', 170, true)
on conflict (slug) do update set is_quick = true;
