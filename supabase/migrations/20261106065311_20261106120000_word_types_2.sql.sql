/*
  Seven new daily puzzle types (main slot, not quick), added 6 Nov 2026.
  Safe to run more than once: an existing row with the same web name is updated to these texts.
*/
insert into public.puzzle_types (slug, name_mr, name_en, about_mr, about_en, how_mr, how_en, tile, sort_order, is_active, is_quick) values
  ('vegla-shabd', 'वेगळा शब्द', 'Odd One Out', 'चार शब्दांपैकी गटात न बसणारा एक शब्द ओळखा.', 'Spot the one word that does not belong with the other three.', 'प्रत्येक फेरीत चार शब्द आहेत. त्यांतले तीन एका गटात बसतात, एक बसत नाही.
तो वेगळा शब्द टॅप करा. चुकला तर दुसरा पर्याय निवडा.
बरोबर उत्तरानंतर तो शब्द वेगळा का, ते दिसेल.
पहिल्याच प्रयत्नात किती फेर्या सोडवल्या, ते शेवटी दिसेल.', 'Each round shows four words. Three share something; one does not.
Tap the odd one out. If you are wrong, try another.
After the right answer you see why it is different.
Your score is the number of rounds solved on the first try.', 'वे', 80, true, false),
  ('haravlele-akshar', 'हरवलेले अक्षर', 'Missing Letter', 'तीन शब्दांमधून हरवलेले एकच अक्षर शोधा.', 'Find the one letter missing from all three words.', 'प्रत्येक फेरीत तीन शब्द आहेत. तिन्ही शब्दांतून एकच अक्षर गायब आहे.
खालच्या सहा अक्षरांतून ते अक्षर टॅप करा.
तेच अक्षर तिन्ही रिकाम्या जागी बसले, तरच उत्तर बरोबर.
चुकीचे अक्षर बाद होते. पुन्हा प्रयत्न करा.', 'Each round shows three words with the same letter missing from each.
Tap that letter from the six choices below.
The answer must fit all three blanks.
A wrong letter is crossed out; try again.', 'ह', 81, true, false),
  ('mi-kon', 'मी कोण?', 'Who Am I?', 'कोडे वाचा आणि अक्षरे जुळवून उत्तर ओळखा.', 'Read the riddle and build the answer from letter tiles.', 'प्रत्येक फेरीत एक "मी कोण?" कोडे आहे.
खालच्या अक्षरांवर टॅप करून उत्तर बनवा. काही अक्षरे फसवी आहेत.
चुकलेले अक्षर परत घ्यायला वरच्या चौकटीवर टॅप करा.
अडलात तर "एक अक्षर" मदत घ्या (पूर्ण कोड्यात तीन वेळा).', 'Each round is a "Who am I?" riddle.
Tap the letter tiles to build the answer. Some tiles are decoys.
Tap a filled box to take a letter back.
Stuck? Use "one letter" help (three times per puzzle).', 'मी', 82, true, false),
  ('shabdashodh', 'शब्दशोध', 'Word Search', 'अक्षरांच्या चौकटीत लपलेले विषयाचे शब्द शोधा.', 'Find the hidden words on a theme in a grid of letters.', 'चौकटीत खालच्या यादीतले शब्द लपलेले आहेत: आडवे, उभे किंवा तिरके.
शब्दाच्या पहिल्या अक्षरावर टॅप करा, मग शेवटच्या अक्षरावर.
बरोबर शब्दाला रंग येतो आणि यादीत तो खोडला जातो.
अडलात तर "पहिले अक्षर दाखवा" (तीन वेळा).', 'Words from the list are hidden in the grid: across, down or diagonal.
Tap the first letter of a word, then its last letter.
A found word is coloured and struck off the list.
Stuck? "Show first letter" (three times).', 'शो', 83, true, false),
  ('madhla-shabd', 'मधला शब्द', 'Middle Word', 'दोन शब्दांना जोडणारा मधला शब्द शोधा.', 'Find the word that joins two others into two compound words.', 'डावीकडच्या शब्दानंतर आणि उजवीकडच्या शब्दाआधी एकच शब्द बसतो.
उदा. बैल __ / __ वान: उत्तर "गाडी" (बैलगाडी, गाडीवान).
अक्षरांवर टॅप करून तो शब्द बनवा. काही अक्षरे फसवी आहेत.
अडलात तर "एक अक्षर" मदत घ्या (तीन वेळा).', 'One word completes both: after the left word and before the right word.
Example: बैल __ / __ वान gives गाडी (बैलगाडी, गाडीवान).
Tap letter tiles to build it. Some tiles are decoys.
Stuck? Use "one letter" help (three times).', 'ध', 84, true, false),
  ('mhan-julva', 'म्हण जुळवा', 'Build the Proverb', 'अर्थ वाचा आणि शब्द योग्य क्रमाने लावून म्हण पूर्ण करा.', 'Read the meaning and arrange the words into the right proverb.', 'प्रत्येक फेरीत एका म्हणीचा अर्थ दिला आहे.
खालचे शब्द योग्य क्रमाने टॅप करून म्हण बनवा. दोन शब्द फसवे आहेत.
चुकलेला शब्द परत घ्यायला वरच्या जागेवर टॅप करा.
अडलात तर "पुढचा शब्द" मदत घ्या (तीन वेळा).', 'Each round gives the meaning of a Marathi proverb.
Tap the words in the right order to build it. Two words are decoys.
Tap a placed word to take it back.
Stuck? Use "next word" help (three times).', 'म्ह', 85, true, false),
  ('mhaniche-aakde', 'म्हणींचे आकडे', 'Numbers in Proverbs', 'म्हणींमधले हरवलेले आकडे भरा.', 'Fill in the numbers missing from well-known proverbs.', 'प्रत्येक म्हणीतून एक किंवा दोन आकडे गायब आहेत.
रिकाम्या जागेवर टॅप करा, मग खालच्या पट्टीतून आकडा निवडा.
बरोबर आकडा म्हणीत शब्द बनून बसतो.
शेवटी आजच्या सगळ्या आकड्यांची बेरीज दिसेल.', 'One or two numbers are missing from each proverb.
Tap a blank, then pick a number from the strip below.
The right number drops into the proverb as a word.
At the end you see the total of all of today''s numbers.', '१', 86, true, false)
on conflict (slug) do update set
  name_mr = excluded.name_mr, name_en = excluded.name_en,
  about_mr = excluded.about_mr, about_en = excluded.about_en,
  how_mr = excluded.how_mr, how_en = excluded.how_en,
  tile = excluded.tile, sort_order = excluded.sort_order,
  is_active = true, is_quick = false;
