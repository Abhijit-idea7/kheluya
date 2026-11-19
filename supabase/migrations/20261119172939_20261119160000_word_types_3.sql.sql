/*
  Four new daily puzzle types, added 19 Nov 2026:
  रिक्षा कोंडी (riksha-kondi), तर्क-तक्ता (tarka-takta), शब्दपेरणी (shabd-perni), सरकते चित्र (sarakte-chitra).
  Data only. Safe to run more than once: an existing row with the same web name is updated to these texts.
*/
insert into public.puzzle_types (slug, name_mr, name_en, about_mr, about_en, how_mr, how_en, tile, sort_order, is_active, is_quick) values
  ('riksha-kondi', 'रिक्षा कोंडी', 'Rickshaw Jam', 'गाड्या पुढे-मागे सरकवा आणि अडकलेल्या रिक्षाला वाट करून द्या.', 'Slide the cars and buses to clear a way out for the rickshaw.', 'पिवळी-हिरवी रिक्षा उजवीकडच्या "बाहेर" दारातून बाहेर काढायची आहे.
एखाद्या गाडीवर टॅप करा. मग बाण दाबा, किंवा ती जिथे न्यायची त्या रिकाम्या चौकटीवर टॅप करा.
आडव्या गाड्या फक्त डावी-उजवीकडे, उभ्या गाड्या फक्त वर-खाली सरकतात.
तीन रस्ते, प्रत्येक थोडा अवघड. अडलात तर "मदत" पुढची चाल दाखवते.', 'Get the yellow-green rickshaw out through the exit on the right.
Tap a vehicle, then press an arrow or tap the empty square where it should go.
Across vehicles move only left-right; upright ones only up-down.
Three boards, each a little harder. "Help" shows the next move.', 'रि', 87, true, false),
  ('tarka-takta', 'तर्क-तक्ता', 'Logic Grid', 'संकेत वाचा आणि कोणाला काय आवडते ते तर्काने शोधा.', 'Read the clues and work out who likes what.', 'वर काही संकेत दिले आहेत. प्रत्येक व्यक्तीला प्रत्येक गटातला एकच पर्याय लागू होतो.
एक पर्याय दोन व्यक्तींना असू शकत नाही.
प्रत्येक व्यक्तीसाठी पर्याय टॅप करा आणि "तपासा" दाबा.
अडलात तर "एक उत्तर दाखवा" (पूर्ण खेळात तीन वेळा).', 'Clues are given at the top. Each person has exactly one option from each group.
No two people share an option.
Tap an option for each person, then press "Check".
Stuck? "Show one answer" (three times per game).', 'त', 88, true, false),
  ('shabd-perni', 'शब्दपेरणी', 'Word Fill-In', 'दिलेले शब्द चौकटीत योग्य जागी पेरा. आडवे-उभे शब्द एकमेकांना जुळायला हवेत.', 'Fit the given words into the grid so that across and down words agree.', 'खाली शब्दांची यादी अक्षरसंख्येनुसार दिली आहे. एक शब्द आधीच बसवलेला आहे.
यादीतला शब्द टॅप करा. त्याच लांबीच्या जागा पिवळ्या दिसतील.
एका पिवळ्या जागेवर टॅप करून शब्द बसवा. आधीच्या शब्दाचे अक्षर जुळले नाही तर तो बसणार नाही.
चुकीचा शब्द काढायचा असेल तर यादीतल्या त्या शब्दावर पुन्हा टॅप करा.', 'The word list below is grouped by length. One word is already placed.
Tap a word in the list; spaces of the same length light up yellow.
Tap a yellow space to place it. It will not go in if a crossing letter clashes.
To take a word back out, tap it again in the list.', 'पे', 89, true, false),
  ('sarakte-chitra', 'सरकते चित्र', 'Sliding Picture', 'तुकडे सरकवून आजी-आजोबांचे चित्र पुन्हा जुळवा.', 'Slide the pieces to put the picture of Aaji and Ajoba back together.', 'चित्राचे आठ तुकडे आणि एक रिकामी जागा आहे.
रिकाम्या जागेच्या शेजारच्या (किंवा त्याच ओळीतल्या) तुकड्यावर टॅप करा; तो रिकाम्या जागी सरकतो.
तुकड्यांवरचे आकडे १ ते ८ क्रमाने लावले की चित्र पूर्ण होते.
दोन चित्रे. अडलात तर "मदत" पुढची चाल दाखवते.', 'The picture has eight pieces and one empty space.
Tap a piece next to (or in line with) the empty space; it slides in.
Put the numbers 1 to 8 in order and the picture is complete.
Two pictures. "Help" shows the next move.', 'स', 90, true, false)
on conflict (slug) do update set
  name_mr = excluded.name_mr, name_en = excluded.name_en,
  about_mr = excluded.about_mr, about_en = excluded.about_en,
  how_mr = excluded.how_mr, how_en = excluded.how_en,
  tile = excluded.tile, sort_order = excluded.sort_order,
  is_active = true, is_quick = false;
