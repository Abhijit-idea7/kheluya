/**
 * Policy pages and the About page, in Marathi and English.
 * {{name}}, {{address}}, {{email}}, {{phone}}, {{grievance}}, {{hours}}, {{city}}, {{codMax}} are filled from
 * Admin → Shop → Shop settings, so the text stays right when those details change.
 * To change a policy, edit the text here and publish. Update LAST_UPDATED when you do.
 */
export type Section = { h: string; p: string[] };
export type LegalDoc = { title: string; intro: string; sections: Section[] };
export type Lang = 'mr' | 'en';

export const LAST_UPDATED: Record<Lang, string> = { mr: '२५ नोव्हेंबर २०२६', en: '25 November 2026' };

export const PRIVACY: Record<Lang, LegalDoc> = {
  mr: {
    title: 'गोपनीयता धोरण',
    intro:
      'चला खेळूया (chalakheluya.com आणि kheluya.in) हे संकेतस्थळ {{name}} चालवते. तुमची कोणती माहिती आमच्याकडे येते, ती कशासाठी वापरतो आणि कशी जपतो, हे इथे सोप्या शब्दांत सांगितले आहे.',
    sections: [
      {
        h: 'कोडी खेळताना',
        p: [
          'कोडी खेळण्यासाठी नाव, मोबाईल नंबर किंवा लॉगिन लागत नाही.',
          'तुमच्या फोनमध्ये (ब्राउझरमध्ये) एक साधा ओळख-क्रमांक ठेवला जातो. त्यामुळे तुम्ही कोणती कोडी खेळली, अर्धवट सोडली आणि किती वेळ लागला हे लक्षात राहते. आम्हाला फक्त एकूण आकडे दिसतात — उदा. आज किती लोकांनी कोडे खेळले. हा क्रमांक तुमच्या नावाशी किंवा नंबरशी जोडलेला नसतो.',
          'तुम्ही कोणत्या लिंकवरून आलात (उदा. WhatsApp, Facebook जाहिरात) हे मोजण्यासाठी लिंकमध्ये छोटी खूण असते. त्यातून तुमची वैयक्तिक ओळख होत नाही.',
        ],
      },
      {
        h: 'तुम्ही स्वतः दिलेली माहिती',
        p: [
          'नवीन कोडी किंवा नवीन वस्तूंची माहिती हवी असल्यास (“मला कळवा”): नाव, WhatsApp नंबर आणि गाव.',
          'संपर्क पानावरून संदेश पाठवल्यास: नाव, फोन नंबर आणि संदेश.',
          'दुकानातून ऑर्डर देताना: नाव, मोबाईल नंबर, ईमेल (ऐच्छिक), डिलिव्हरीचा पत्ता आणि UPI ने पैसे भरल्यास UPI संदर्भ क्रमांक.',
          'ऑर्डरच्या पानावर नाव आणि मोबाईल नंबर लिहिल्यावर, ऑर्डर पूर्ण झाली नाही तरी ते (निवडलेल्या वस्तूंसह) जतन होतात — अडचण आली असल्यास मदतीसाठी आम्ही WhatsApp वर संपर्क करू शकतो. “आम्ही संपर्क करू” निवडल्यास तुमचा नंबर आणि प्रश्न जतन होतो. ही माहिती ३० दिवसांनंतर वापरली जात नाही.',
          'रोजच्या कोड्याची सूचना (notification) तुम्ही सुरू केल्यास, तुमचा ब्राउझर आम्हाला सूचना पाठवण्यासाठी एक पत्ता देतो. सूचना कधीही बंद करता येतात.',
        ],
      },
      {
        h: 'पेमेंटची माहिती',
        p: [
          'UPI ने भरलेले पैसे तुमच्या UPI ॲपमधून थेट आमच्या बँक खात्यात येतात. आम्हाला फक्त रक्कम, नाव आणि संदर्भ क्रमांक दिसतो.',
          'कार्ड / नेटबँकिंगने पेमेंट Razorpay या मान्यताप्राप्त पेमेंट कंपनीमार्फत होते.',
          'कार्ड क्रमांक, CVV, UPI PIN, OTP किंवा बँकेचा पासवर्ड आमच्याकडे कधीच येत नाही. आम्ही तो फोनवर किंवा WhatsApp वर कधीही विचारत नाही — कोणी विचारल्यास देऊ नका.',
        ],
      },
      {
        h: 'माहिती कशासाठी वापरतो',
        p: [
          'ऑर्डर पोहोचवणे, GST बिल बनवणे आणि ऑर्डरबद्दल WhatsApp / फोनवर कळवणे.',
          'तुम्ही मागितलेली माहिती पाठवणे (नवीन कोडी, नवीन वस्तू) आणि तुमच्या प्रश्नांना उत्तर देणे.',
          'संकेतस्थळ सुधारणे, गैरवापर आणि खोट्या ऑर्डर रोखणे.',
          'तुमची माहिती आम्ही कोणालाही विकत नाही आणि भाड्याने देत नाही.',
        ],
      },
      {
        h: 'माहिती कोणाला दिली जाते',
        p: [
          'पार्सल पोहोचवणारी संस्था (India Post किंवा कुरिअर): नाव, पत्ता आणि फोन नंबर.',
          'पेमेंट कंपनी (Razorpay): ऑनलाइन पेमेंटसाठी आवश्यक तेवढीच माहिती.',
          'संकेतस्थळ चालवण्यासाठी वापरलेल्या सुरक्षित क्लाउड सेवा (वेबसाइट होस्टिंग आणि डेटाबेस — Supabase). ही माहिती भारताबाहेरील सर्व्हरवर साठवली जाऊ शकते.',
          'कायद्याने बंधनकारक असल्यास सरकारी यंत्रणा.',
          'WhatsApp कम्युनिटी आणि Facebook / Instagram वरील आमची पाने त्या-त्या कंपनीच्या स्वतःच्या गोपनीयता धोरणानुसार चालतात.',
        ],
      },
      {
        h: 'किती काळ ठेवतो',
        p: [
          'ऑर्डर आणि GST बिले: GST व कर कायद्यानुसार आवश्यक तेवढा काळ (साधारण ८ वर्षे).',
          'इतर माहिती (WhatsApp नंबर, संदेश): तुम्ही काढून टाकायला सांगेपर्यंत, किंवा तिची गरज संपेपर्यंत.',
        ],
      },
      {
        h: 'तुमचे हक्क',
        p: [
          'तुमची आमच्याकडे असलेली माहिती पाहणे, दुरुस्त करणे किंवा काढून टाकायला सांगणे (कायद्याने ठेवणे बंधनकारक असलेली बिले सोडून).',
          'WhatsApp वरील माहिती किंवा सूचना थांबवायला सांगणे.',
          'हे हक्क भारताच्या डिजिटल वैयक्तिक माहिती संरक्षण कायदा, २०२३ नुसार आहेत. खालील तक्रार अधिकाऱ्याशी संपर्क करा.',
        ],
      },
      {
        h: 'सुरक्षा',
        p: [
          'संकेतस्थळ सुरक्षित (https) जोडणीवरून चालते. माहिती पाहण्याची परवानगी फक्त आमच्या मोजक्या जबाबदार व्यक्तींना आहे.',
        ],
      },
      {
        h: 'मुले',
        p: [
          'आमची सेवा प्रौढांसाठी आहे. मुले घरच्यांसोबत कोडी खेळू शकतात, पण ऑर्डर किंवा नोंदणी पालकांनी करावी.',
        ],
      },
      {
        h: 'या धोरणात बदल',
        p: ['धोरणात बदल झाल्यास नवीन मजकूर याच पानावर, नव्या तारखेसह दिसेल.'],
      },
    ],
  },
  en: {
    title: 'Privacy policy',
    intro:
      'Chala Kheluya (chalakheluya.com and kheluya.in) is run by {{name}}. This page explains, in plain words, what information reaches us, why we use it and how we look after it.',
    sections: [
      {
        h: 'When you play puzzles',
        p: [
          'You do not need a name, phone number or login to play.',
          'Your phone’s browser keeps a simple random ID, so the site remembers which puzzles you played, left half-way and how long they took. We only see totals — for example, how many people played today. This ID is not linked to your name or number.',
          'Links carry a small tag that tells us where visitors came from (for example WhatsApp or a Facebook ad). It does not identify you.',
        ],
      },
      {
        h: 'Information you give us',
        p: [
          'If you ask to hear about new puzzles or products (“Notify me”): name, WhatsApp number and town.',
          'If you write to us from the Contact page: name, phone number and your message.',
          'When you order from the shop: name, mobile number, email (optional), delivery address and, if you pay by UPI, the UPI reference number.',
          'Once you type your name and mobile number on the order page, they are saved (with the items you chose) even if the order is not finished — so that we can contact you on WhatsApp if you had a problem. If you choose “We’ll contact you”, your number and question are saved. We do not use this after 30 days.',
          'If you turn on the daily puzzle notification, your browser gives us an address to send it to. You can turn notifications off at any time.',
        ],
      },
      {
        h: 'Payments',
        p: [
          'UPI payments go from your UPI app straight to our bank account. We only see the amount, the name and the reference number.',
          'Card and netbanking payments are handled by Razorpay, a regulated payment company.',
          'Card numbers, CVV, UPI PIN, OTPs and bank passwords never reach us. We will never ask for them by phone or WhatsApp — do not share them with anyone who asks.',
        ],
      },
      {
        h: 'How we use it',
        p: [
          'To deliver orders, make GST invoices and update you about your order on WhatsApp or phone.',
          'To send what you asked for (new puzzles, new products) and to answer your questions.',
          'To improve the site and to prevent misuse and fake orders.',
          'We never sell or rent your information to anyone.',
        ],
      },
      {
        h: 'Who we share it with',
        p: [
          'The delivery service (India Post or a courier): name, address and phone number.',
          'The payment company (Razorpay): only what an online payment needs.',
          'The secure cloud services that run the site (website hosting and database — Supabase). Data may be stored on servers outside India.',
          'Government authorities, where the law requires it.',
          'Our WhatsApp community and our Facebook / Instagram pages are covered by those companies’ own privacy policies.',
        ],
      },
      {
        h: 'How long we keep it',
        p: [
          'Orders and GST invoices: as long as GST and tax laws require (about 8 years).',
          'Other information (WhatsApp numbers, messages): until you ask us to delete it, or it is no longer needed.',
        ],
      },
      {
        h: 'Your rights',
        p: [
          'You can ask to see, correct or delete the information we hold about you (except invoices the law requires us to keep).',
          'You can ask us to stop WhatsApp updates or notifications.',
          'These rights come from India’s Digital Personal Data Protection Act, 2023. Contact the grievance officer below.',
        ],
      },
      {
        h: 'Security',
        p: ['The site runs over a secure (https) connection. Only a few responsible people at our end can see your information.'],
      },
      {
        h: 'Children',
        p: ['Our service is meant for adults. Children are welcome to play with their family, but orders and sign-ups should be made by a parent.'],
      },
      {
        h: 'Changes to this policy',
        p: ['If this policy changes, the new text will appear on this page with a new date.'],
      },
    ],
  },
};

export const TERMS: Record<Lang, LegalDoc> = {
  mr: {
    title: 'अटी व शर्ती',
    intro:
      'चला खेळूया (chalakheluya.com आणि kheluya.in) हे संकेतस्थळ {{name}} चालवते. संकेतस्थळ वापरताना किंवा दुकानातून खरेदी करताना तुम्ही खालील अटी मान्य करता.',
    sections: [
      {
        h: 'कोडी',
        p: [
          'कोडी विनामूल्य आहेत आणि वैयक्तिक वापरासाठी आहेत.',
          'कोडी, चित्रे आणि मजकूर यांचे सर्व हक्क {{name}} कडे आहेत. कोड्यांची लिंक मित्र-मैत्रिणींना जरूर पाठवा, पण परवानगीशिवाय कोडी कॉपी करून प्रसिद्ध करू नका किंवा विकू नका.',
        ],
      },
      {
        h: 'योग्य वापर',
        p: [
          'संकेतस्थळाचा गैरवापर, त्यात घुसखोरीचा प्रयत्न, स्वयंचलित पद्धतीने माहिती उचलणे किंवा खोट्या ऑर्डर देणे यास मनाई आहे.',
        ],
      },
      {
        h: 'किंमती',
        p: [
          'सर्व किंमती भारतीय रुपयांत (₹) आहेत आणि त्यात GST समाविष्ट आहे.',
          'भारतात कुठेही डिलिव्हरी मोफत आहे. कोणताही छुपा खर्च नाही.',
          'किंमती बदलू शकतात, पण ऑर्डर दिल्यावर त्या ऑर्डरची किंमत बदलत नाही. किंमतीत स्पष्ट चूक असल्यास आम्ही ऑर्डर रद्द करून पूर्ण पैसे परत करू शकतो.',
        ],
      },
      {
        h: 'ऑर्डर आणि पेमेंट',
        p: [
          'पैसे भरण्याचे मार्ग: UPI ने थेट आमच्या खात्यात, ऑनलाइन (Razorpay — उपलब्ध असताना) आणि ₹{{codMax}} पर्यंतच्या ऑर्डरसाठी कॅश ऑन डिलिव्हरी.',
          'UPI / ऑनलाइन ऑर्डर पैसे मिळाल्यावर पक्की होते. UPI ने २४ तासांत पैसे न आल्यास ऑर्डर आपोआप रद्द होते.',
          'माल संपल्यास, पत्ता पोहोचण्याजोगा नसल्यास किंवा ऑर्डर संशयास्पद वाटल्यास आम्ही ऑर्डर रद्द करू शकतो. भरलेले पैसे पूर्ण परत केले जातात.',
          'प्रत्येक पाठवलेल्या ऑर्डरसह GST बिल मिळते (ऑर्डरच्या पानावरून पाहता / प्रिंट करता येते).',
        ],
      },
      {
        h: 'वस्तूंची माहिती',
        p: [
          'फोटो वस्तू कशी दिसते हे दाखवण्यासाठी आहेत; रंगात थोडा फरक असू शकतो.',
          'आमच्या सर्व वस्तू भारतात बनवलेल्या आहेत (मूळ देश: भारत).',
        ],
      },
      {
        h: 'डिलिव्हरी, रद्द करणे आणि परतावा',
        p: ['यासाठी “डिलिव्हरी धोरण” आणि “रद्द व परतावा धोरण” ही पाने पाहा. ती या अटींचाच भाग आहेत.'],
      },
      {
        h: 'जबाबदारी',
        p: [
          'संकेतस्थळ नीट चालावे यासाठी आम्ही प्रयत्न करतो, पण ते कधीही बंद पडणार नाही याची हमी देऊ शकत नाही.',
          'कोणत्याही ऑर्डरसाठी आमची जबाबदारी त्या ऑर्डरच्या रकमेपर्यंतच मर्यादित आहे.',
        ],
      },
      {
        h: 'कायदा आणि न्यायक्षेत्र',
        p: ['या अटींना भारतीय कायदे लागू आहेत. वाद झाल्यास {{city}} येथील न्यायालयांना अधिकार क्षेत्र असेल.'],
      },
    ],
  },
  en: {
    title: 'Terms and conditions',
    intro:
      'Chala Kheluya (chalakheluya.com and kheluya.in) is run by {{name}}. By using the site or buying from the shop, you agree to these terms.',
    sections: [
      {
        h: 'Puzzles',
        p: [
          'The puzzles are free and meant for personal use.',
          'All rights in the puzzles, pictures and text belong to {{name}}. Please share puzzle links with friends, but do not copy, publish or sell the puzzles without our permission.',
        ],
      },
      {
        h: 'Fair use',
        p: ['Misusing the site, trying to break into it, scraping it automatically or placing fake orders is not allowed.'],
      },
      {
        h: 'Prices',
        p: [
          'All prices are in Indian rupees (₹) and include GST.',
          'Delivery anywhere in India is free. There are no hidden charges.',
          'Prices may change, but the price of an order does not change once it is placed. If a price is clearly wrong, we may cancel the order and refund it in full.',
        ],
      },
      {
        h: 'Orders and payment',
        p: [
          'Ways to pay: UPI straight to our account, online through Razorpay (when available), and cash on delivery for orders up to ₹{{codMax}}.',
          'A UPI / online order is confirmed when the payment reaches us. If a UPI payment does not arrive within 24 hours, the order cancels itself.',
          'We may cancel an order if an item runs out, the address cannot be reached or the order looks suspicious. Any money paid is refunded in full.',
          'Every shipped order comes with a GST invoice (view or print it from the order page).',
        ],
      },
      {
        h: 'Product information',
        p: ['Photos show what the item looks like; colours may differ slightly.', 'All our products are made in India (country of origin: India).'],
      },
      {
        h: 'Delivery, cancellation and refunds',
        p: ['See the “Delivery policy” and “Cancellation and refund policy” pages. They are part of these terms.'],
      },
      {
        h: 'Liability',
        p: [
          'We work to keep the site running well but cannot promise it will never be unavailable.',
          'For any order, our liability is limited to the amount of that order.',
        ],
      },
      {
        h: 'Law and jurisdiction',
        p: ['These terms are governed by the laws of India. Courts at {{city}} will have jurisdiction over any dispute.'],
      },
    ],
  },
};

export const SHIPPING: Record<Lang, LegalDoc> = {
  mr: {
    title: 'डिलिव्हरी धोरण',
    intro: 'चला खेळूया दुकानातून घेतलेली वस्तू तुमच्या घरी कशी आणि कधी पोहोचते, याची माहिती.',
    sections: [
      {
        h: 'कुठे पाठवतो',
        p: ['भारतात India Post किंवा कुरिअर जिथे पोहोचते त्या सर्व पिनकोडवर. सध्या परदेशात पाठवत नाही.'],
      },
      { h: 'डिलिव्हरीचा खर्च', p: ['मोफत. ऑर्डरची रक्कम कितीही असो, डिलिव्हरीचे वेगळे पैसे लागत नाहीत.'] },
      {
        h: 'केव्हा पाठवतो',
        p: [
          'पैसे मिळाल्यावर (कॅश ऑन डिलिव्हरीसाठी ऑर्डर पक्की झाल्यावर) २ कामकाजाच्या दिवसांत पार्सल पाठवतो. रविवार आणि सार्वजनिक सुट्ट्या धरल्या जात नाहीत.',
        ],
      },
      {
        h: 'किती दिवस लागतात',
        p: [
          'पाठवल्यानंतर साधारण ३ ते ७ कामकाजाचे दिवस. दुर्गम भागात १० ते १२ दिवस लागू शकतात.',
          'उशीर होत असल्यास आम्ही WhatsApp वर कळवू.',
        ],
      },
      {
        h: 'पार्सल कुठे आहे ते पाहणे',
        p: [
          'पार्सल पाठवल्यावर WhatsApp वर ट्रॅकिंग नंबर पाठवतो. तो तुमच्या ऑर्डरच्या पानावरही दिसतो (“माझ्या ऑर्डर”).',
        ],
      },
      {
        h: 'कॅश ऑन डिलिव्हरी',
        p: ['₹{{codMax}} पर्यंतच्या ऑर्डरसाठी उपलब्ध. पार्सल हातात आल्यावर पोस्टमन / कुरिअरला रोख पैसे द्या.'],
      },
      {
        h: 'पत्ता आणि फोन नंबर',
        p: [
          'पूर्ण पत्ता, पिनकोड आणि चालू मोबाईल नंबर द्या. चुकीच्या पत्त्यामुळे पार्सल परत आल्यास आम्ही तुमच्याशी संपर्क करून पुन्हा पाठवू.',
        ],
      },
      {
        h: 'खराब झालेले पार्सल',
        p: [
          'पार्सल फाटलेले किंवा ओले दिसल्यास, शक्य असल्यास उघडताना फोटो काढा आणि ७ दिवसांत WhatsApp वर कळवा. आम्ही बदलून देऊ किंवा पैसे परत करू (“रद्द व परतावा धोरण” पाहा).',
        ],
      },
    ],
  },
  en: {
    title: 'Delivery policy',
    intro: 'How and when your Chala Kheluya order reaches your home.',
    sections: [
      { h: 'Where we deliver', p: ['To every pincode in India that India Post or a courier reaches. We do not ship abroad at present.'] },
      { h: 'Delivery charges', p: ['Free. Whatever the order amount, there is no separate delivery charge.'] },
      {
        h: 'When we dispatch',
        p: [
          'Within 2 working days after we receive payment (for cash on delivery, after the order is confirmed). Sundays and public holidays are not counted.',
        ],
      },
      {
        h: 'How long it takes',
        p: ['Usually 3 to 7 working days after dispatch. Remote areas may take 10 to 12 days.', 'If there is a delay, we will tell you on WhatsApp.'],
      },
      {
        h: 'Tracking',
        p: ['When the parcel is sent, we WhatsApp you the tracking number. It also shows on your order page (“My orders”).'],
      },
      {
        h: 'Cash on delivery',
        p: ['Available for orders up to ₹{{codMax}}. Pay the postman / courier in cash when the parcel reaches you.'],
      },
      {
        h: 'Address and phone number',
        p: [
          'Give a full address, pincode and a working mobile number. If a parcel comes back because of a wrong address, we will contact you and send it again.',
        ],
      },
      {
        h: 'Damaged parcels',
        p: [
          'If the parcel looks torn or wet, take photos while opening it if you can, and tell us on WhatsApp within 7 days. We will replace the item or refund you (see the “Cancellation and refund policy”).',
        ],
      },
    ],
  },
};

export const REFUNDS: Record<Lang, LegalDoc> = {
  mr: {
    title: 'रद्द व परतावा धोरण',
    intro: 'ऑर्डर रद्द करणे, खराब किंवा चुकीची वस्तू आल्यास काय करावे, आणि पैसे परत कसे मिळतात याची माहिती.',
    sections: [
      {
        h: 'ऑर्डर रद्द करणे',
        p: [
          'पार्सल पाठवण्यापूर्वी ऑर्डर कधीही रद्द करता येते. ऑर्डर क्रमांकासह WhatsApp वर किंवा संपर्क पानावरून कळवा. भरलेले सर्व पैसे परत मिळतील.',
          'पार्सल पाठवल्यानंतर ऑर्डर रद्द करता येत नाही. कॅश ऑन डिलिव्हरी पार्सल नको असल्यास ते घेण्यास नकार देऊ शकता; त्यासाठी काहीही भरावे लागत नाही.',
        ],
      },
      {
        h: 'खराब, सदोष किंवा चुकीची वस्तू',
        p: [
          'वस्तू फाटलेली, तुटलेली, छपाईत दोष असलेली (उदा. पाने कमी, उलटी छपाई) किंवा चुकीची आली असल्यास, डिलिव्हरीनंतर ७ दिवसांच्या आत ऑर्डर क्रमांक आणि फोटोसह WhatsApp वर कळवा.',
          'तपासून आम्ही नवीन वस्तू मोफत पाठवू किंवा पूर्ण पैसे परत करू — तुम्ही निवडा.',
          'खराब वस्तू परत मागवायची असल्यास तिचा पाठवण्याचा खर्च आम्ही करू.',
        ],
      },
      {
        h: 'मन बदलल्यास',
        p: [
          'छापील पुस्तके आणि खेळ एकदा पोहोचल्यावर, केवळ “आवडले नाही” किंवा “नको” या कारणासाठी परत घेता येत नाहीत. शंका असल्यास ऑर्डर देण्यापूर्वी आम्हाला विचारा.',
        ],
      },
      {
        h: 'पैसे परत कसे आणि कधी मिळतात',
        p: [
          'परतावा मंजूर झाल्यावर ५ ते ७ कामकाजाच्या दिवसांत.',
          'UPI ने भरले असल्यास: त्याच UPI ID / बँक खात्यात.',
          'ऑनलाइन (Razorpay) भरले असल्यास: ज्या कार्ड / खात्यातून भरले त्यातच. बँकेनुसार पैसे दिसायला काही दिवस अधिक लागू शकतात.',
          'कॅश ऑन डिलिव्हरीसाठी: तुम्ही सांगाल त्या UPI ID किंवा बँक खात्यात.',
          'डिलिव्हरी मोफत असल्याने परताव्यातून कोणताही खर्च कापला जात नाही.',
        ],
      },
      {
        h: 'कसे कळवायचे',
        p: ['WhatsApp / फोन: {{phone}} · ईमेल: {{email}} · किंवा संपर्क पानावरील फॉर्म. ऑर्डर क्रमांक (उदा. CK1024) नक्की लिहा.'],
      },
    ],
  },
  en: {
    title: 'Cancellation and refund policy',
    intro: 'How to cancel an order, what to do if an item arrives damaged or wrong, and how refunds are paid.',
    sections: [
      {
        h: 'Cancelling an order',
        p: [
          'You can cancel at any time before the parcel is dispatched. Tell us on WhatsApp or through the Contact page with your order number. You will get all your money back.',
          'Once dispatched, an order cannot be cancelled. For cash on delivery, you may refuse the parcel; you pay nothing.',
        ],
      },
      {
        h: 'Damaged, defective or wrong items',
        p: [
          'If an item arrives torn, broken, with a printing defect (for example missing or upside-down pages) or is the wrong item, tell us on WhatsApp within 7 days of delivery, with your order number and a photo.',
          'After checking, we will send a new item free or refund you in full — your choice.',
          'If we need the damaged item back, we pay for sending it.',
        ],
      },
      {
        h: 'Change of mind',
        p: [
          'Printed books and games cannot be returned once delivered just because you no longer want them. If you are unsure, please ask us before ordering.',
        ],
      },
      {
        h: 'How and when refunds are paid',
        p: [
          'Within 5 to 7 working days after the refund is approved.',
          'Paid by UPI: back to the same UPI ID / bank account.',
          'Paid online (Razorpay): back to the same card / account. Your bank may take a few more days to show it.',
          'Cash on delivery: to a UPI ID or bank account you give us.',
          'Delivery is free, so nothing is deducted from a refund.',
        ],
      },
      {
        h: 'How to reach us',
        p: ['WhatsApp / phone: {{phone}} · Email: {{email}} · or the form on the Contact page. Please mention your order number (for example CK1024).'],
      },
    ],
  },
};

export const ABOUT: Record<Lang, LegalDoc> = {
  mr: {
    title: 'आमच्याबद्दल',
    intro: 'रोज सकाळी एक नवीन मराठी कोडे — मोठ्या अक्षरात, फोनवर, काहीही डाउनलोड न करता.',
    sections: [
      {
        h: 'चला खेळूया म्हणजे काय?',
        p: [
          'शब्दकोडे, अक्षर-सुडोकू, म्हणींची कोडी असे वेगवेगळे मराठी खेळ. रोज एक नवीन कोडे येते आणि राहिलेली कोडी कधीही खेळता येतात.',
          'खेळ पूर्णपणे विनामूल्य आहेत. नोंदणी, पासवर्ड किंवा ॲप लागत नाही — लिंक उघडा आणि खेळा.',
        ],
      },
      {
        h: 'कोणासाठी?',
        p: [
          'ज्येष्ठ नागरिक, निवृत्त मंडळी आणि मराठीवर प्रेम करणाऱ्या सर्वांसाठी. अक्षरे मोठी, बटणे मोठी आणि नियम सोपे ठेवले आहेत.',
          'नातवंडांसोबत, मित्रमंडळींसोबत खेळा आणि WhatsApp वर निकाल शेअर करा.',
        ],
      },
      {
        h: 'का?',
        p: [
          'रोज थोडा वेळ डोक्याला चालना मिळावी, मराठी शब्दांची गोडी टिकावी आणि दिवसाची सुरुवात आनंदाने व्हावी, हा आमचा उद्देश आहे.',
        ],
      },
      {
        h: 'दुकान',
        p: ['फोनपेक्षा कागदावर खेळायला आवडत असेल तर मोठ्या अक्षरातील कोड्यांची पुस्तके आणि पारंपरिक खेळ घरपोच मिळतात — डिलिव्हरी मोफत.'],
      },
      {
        h: 'आम्ही कोण?',
        p: [
          'चला खेळूया हा {{name}} चा उपक्रम आहे. प्रौढांसाठी शिकणे सोपे आणि आनंददायी करणे हे आमचे काम आहे — तोच अनुभव आम्ही या कोड्यांमध्ये आणला आहे.',
        ],
      },
    ],
  },
  en: {
    title: 'About us',
    intro: 'A new Marathi puzzle every morning — in big letters, on your phone, nothing to download.',
    sections: [
      {
        h: 'What is Chala Kheluya?',
        p: [
          'Marathi word games: crosswords, letter sudoku, proverb puzzles and more. A new puzzle arrives every day, and you can play any you missed.',
          'The games are completely free. No sign-up, password or app — open the link and play.',
        ],
      },
      {
        h: 'Who is it for?',
        p: [
          'Senior citizens, retired people and everyone who loves Marathi. Big letters, big buttons and simple rules.',
          'Play with grandchildren and friends, and share your result on WhatsApp.',
        ],
      },
      { h: 'Why?', p: ['A few minutes a day to keep the mind active, enjoy Marathi words, and start the day happily.'] },
      {
        h: 'The shop',
        p: ['If you prefer paper to a phone, large-print puzzle books and traditional games are delivered to your home — delivery is free.'],
      },
      {
        h: 'Who we are',
        p: ['Chala Kheluya is an initiative of {{name}}. Our work is making learning easy and enjoyable for adults — and that is what we bring to these puzzles.'],
      },
    ],
  },
};
