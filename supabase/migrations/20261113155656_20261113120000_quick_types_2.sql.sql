/*
  Six new quick puzzle and game types (non-word), added 13 Nov 2026.
  Safe to run more than once: an existing row with the same web name is updated to these texts.
*/
insert into public.puzzle_types (slug, name_mr, name_en, about_mr, about_en, how_mr, how_en, tile, sort_order, is_active, is_quick) values
  ('dive-lava', 'दिवे लावा', 'Light the Diyas', 'एका दिव्यावर टॅप केले की तो आणि शेजारचे दिवे बदलतात. सगळे दिवे लावा!', 'Tapping a diya flips it and its neighbours. Light them all!', 'एका दिव्यावर टॅप केले की तो दिवा आणि त्याच्या वर-खाली-डावीकडे-उजवीकडचे दिवे बदलतात: विझलेला लागतो, लागलेला विझतो.
सगळे सोळा दिवे लावले की कोडे सुटले.
कमीत कमी टॅपमध्ये सोडवायचा प्रयत्न करा.
अडलात तर "मदत" कुठे टॅप करायचे ते दाखवते. "पुन्हा सुरुवात" ने पहिल्यापासून सुरू करा.', 'Tapping a diya flips it and the diyas above, below, left and right of it.
Light all sixteen diyas to solve the puzzle.
Try to solve it in as few taps as possible.
Stuck? "Help" shows a diya to tap. "Start over" resets the board.', 'दि', 180, true, true),
  ('pudhe-kay', 'पुढे काय?', 'What Comes Next?', 'आकडे आणि चित्रांची मालिका ओळखा आणि पुढे काय येईल ते निवडा.', 'Spot the pattern in each series and pick what comes next.', 'प्रत्येक फेरीत आकडे किंवा चित्रांची एक मालिका आहे.
मालिकेचा नियम ओळखा आणि "?" च्या जागी काय येईल ते टॅप करा.
चुकले तर दुसरा पर्याय निवडा.
बरोबर उत्तरानंतर नियम दिसेल.', 'Each round shows a series of numbers or pictures.
Find the rule and tap what replaces the "?".
If wrong, try another option.
The rule is shown after the right answer.', 'पु', 190, true, true),
  ('bajar-hishob', 'बाजार हिशोब', 'Market Sums', 'बाजाराची यादी पाहा, बेरीज करा आणि नेमके पैसे द्या.', 'Read the shopping list, add it up and pay the exact amount.', 'प्रत्येक फेरीत बाजाराची एक यादी आहे. एकूण किती पैसे झाले ते मनात मोजा.
खालच्या नोटा आणि नाण्यांवर टॅप करून नेमकी रक्कम जमा करा.
चुकलेली नोट परत घ्यायला वरच्या "दिलेले पैसे" मधील नोटेवर टॅप करा.
"पैसे द्या" दाबा. रक्कम नेमकी असेल तरच पुढची यादी.', 'Each round is a shopping list. Work out the total in your head.
Tap notes and coins to put together the exact amount.
Tap a note in "paid" to take it back.
Press "Pay". Only the exact amount moves you on.', 'बा', 200, true, true),
  ('athva-pahu', 'आठवा पाहू', 'Remember the Order', 'दिवे कोणत्या क्रमाने चमकले ते लक्षात ठेवा आणि तसेच टॅप करा.', 'Watch the lamps light up and tap them in the same order.', '"दाखवा" दाबले की काही दिवे एकामागून एक चमकतात.
तो क्रम लक्षात ठेवा आणि त्याच क्रमाने दिव्यांवर टॅप करा.
प्रत्येक फेरीत क्रम थोडा मोठा होतो. एकूण आठ फेऱ्या.
चुकले तर तीच फेरी पुन्हा. क्रम पुन्हा पाहायचा असेल तर "पुन्हा दाखवा".', 'Press "Show" and some lamps light up one after another.
Remember the order and tap the lamps in the same order.
Each round the order gets a little longer. Eight rounds in all.
A mistake repeats the round. "Show again" replays the order.', 'आठ', 210, true, true),
  ('fuge-phoda', 'फुगे फोडा', 'Pop the Balloons', 'एका मिनिटात सांगितलेल्या रंगाचे फुगे फोडा. दुसऱ्या रंगाचा फुगा फोडला तर गुण कमी!', 'In one minute, pop balloons of the colour shown. Wrong colours cost points!', '"सुरू करा" दाबा. खालून फुगे वर येतील.
वर सांगितलेल्या रंगाचेच फुगे टॅप करून फोडा: प्रत्येकी १ गुण.
दुसऱ्या रंगाचा फुगा फोडला तर १ गुण कमी (गुण शून्याखाली जात नाहीत).
दर २० सेकंदांनी रंग बदलतो. खेळ एका मिनिटाचा.', 'Press "Start". Balloons float up from the bottom.
Tap only balloons of the colour shown: 1 point each.
Popping another colour takes 1 point off.
The colour changes every 20 seconds. The game lasts one minute.', 'फु', 220, true, true),
  ('ambe-zela', 'आंबे झेला', 'Catch the Mangoes', 'टोपली हलवून पडणारे आंबे झेला, दगड टाळा. खेळ एका मिनिटाचा.', 'Move the basket to catch falling mangoes and dodge the stones. One minute.', '"सुरू करा" दाबा. झाडावरून आंबे आणि दगड पडतील.
टोपली जिथे हवी तिथे खेळाच्या जागेत टॅप करा (किंवा बोट फिरवा). टोपली तिकडे सरकते.
आंबा: १ गुण. सोनेरी आंबा: ३ गुण. दगड: २ गुण कमी.
खेळ एका मिनिटाचा.', 'Press "Start". Mangoes and stones fall from the tree.
Tap (or slide your finger) where you want the basket; it moves there.
Mango: 1 point. Golden mango: 3 points. Stone: minus 2.
The game lasts one minute.', 'आं', 230, true, true)
on conflict (slug) do update set
  name_mr = excluded.name_mr, name_en = excluded.name_en,
  about_mr = excluded.about_mr, about_en = excluded.about_en,
  how_mr = excluded.how_mr, how_en = excluded.how_en,
  tile = excluded.tile, sort_order = excluded.sort_order,
  is_active = true, is_quick = true;
