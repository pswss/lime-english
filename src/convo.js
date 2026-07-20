// 가상 원어민 튜터 대화 스크립트 (영상 통화용)
// 엔진 규칙: 튜터가 say를 말함 → 사용자의 답을 keywords로 판정
// → 일치: onMatch(있으면) 또는 공용 리액션 후 다음 교환 / 불일치: onMiss로 1회 재질문
export const TUTOR = {
  name: 'Emma',
  tag: '뉴욕 출신 · 원어민 영어 튜터',
  bio: '천천히, 또박또박 말해 줄게요. 틀려도 괜찮아요 — 대화가 실력이 됩니다!',
};

export const REACTIONS = [
  "That's awesome!",
  'Oh, nice! I love that.',
  "Really? That's so interesting.",
  'Haha, same here!',
  'Good to know. Thanks for sharing!',
  "That sounds great. You're doing really well!",
];

export const MISS_LINES = [
  "Sorry, I didn't quite catch that. One more time?",
  'Hmm, could you say that again a little slower?',
  "No worries, take your time. Let's try once more.",
];

export const MOVE_ON = [
  "That's okay! Let's talk about something else.",
  'No problem at all. Moving on!',
  "Don't worry about it. Next question!",
];

const ANY = [/\w{2,}/];

export const TOPICS = [
  {
    id: 'greeting',
    title: '인사와 소개',
    exchanges: [
      {
        say: "Hi there! I'm Emma. It's so nice to finally see you! What's your name?",
        ko: '안녕하세요! 저는 엠마예요. 드디어 만나서 반가워요! 이름이 뭐예요?',
        keywords: [/name is/i, /\bi'?m\b/i, /call me/i],
        replies: ['Hi Emma! My name is Mina.', "I'm Juho. Nice to meet you too!", 'You can call me Sunny.'],
        onMatch: 'What a lovely name! Great to meet you.',
      },
      {
        say: 'So, how are you doing today?',
        ko: '오늘 기분은 어때요?',
        keywords: [/good|great|fine|okay|not bad|tired|happy|so so/i],
        replies: ["I'm doing great, thanks!", "I'm a little tired today.", 'Not bad. How about you?'],
        onMatch: "Glad to hear it! I'm doing wonderful today.",
      },
      {
        say: 'Where are you calling from? Tell me about your city.',
        ko: '어디에서 전화하고 있어요? 당신의 도시에 대해 말해 주세요.',
        keywords: [/from|live in|city|seoul|busan|korea/i],
        replies: ["I'm calling from Seoul, Korea.", 'I live in Busan. It has a beautiful beach.', "I'm from a small city near Seoul."],
        onMatch: "Wow, I'd love to visit someday!",
      },
    ],
  },
  {
    id: 'hobby',
    title: '취미',
    exchanges: [
      {
        say: 'So tell me, what do you like to do in your free time?',
        ko: '여가 시간에 뭐 하는 걸 좋아해요?',
        keywords: [/like|love|enjoy|usually|watch|play|read|listen/i],
        replies: ['I like watching movies.', 'I enjoy playing soccer with my friends.', 'I usually read books at a cafe.'],
      },
      {
        say: 'Oh nice! How often do you do that?',
        ko: '오, 좋네요! 얼마나 자주 해요?',
        keywords: [/every|once|twice|often|sometimes|week|day|month/i],
        replies: ['Every weekend.', 'Once or twice a week.', 'Almost every day!'],
        onMatch: "That's a great routine. Consistency is everything!",
      },
      {
        say: 'Is there a new hobby you want to try this year?',
        ko: '올해 새로 도전해 보고 싶은 취미가 있어요?',
        keywords: ANY,
        replies: ['I want to learn swimming.', 'Maybe rock climbing. It looks fun!', "I'd like to try baking bread."],
        onMatch: 'You should totally go for it!',
      },
    ],
  },
  {
    id: 'food',
    title: '음식',
    exchanges: [
      {
        say: "I'm getting hungry! What's your favorite food?",
        ko: '배가 고파지네요! 가장 좋아하는 음식이 뭐예요?',
        keywords: [/favorite|like|love|pizza|chicken|kimchi|noodle|rice|sushi/i],
        replies: ['My favorite food is fried chicken.', 'I love kimchi stew!', 'Pizza, definitely pizza.'],
        onMatch: 'Yum! Now I want some too.',
      },
      {
        say: 'Can you cook? What do you usually make at home?',
        ko: '요리할 줄 알아요? 집에서 주로 뭘 만들어요?',
        keywords: [/cook|make|ramen|egg|pasta|can'?t|cannot/i],
        replies: ['I usually make pasta.', 'I can only cook ramen, honestly.', "I can't cook at all!"],
        onMatch: "Haha, that still counts as cooking!",
      },
      {
        say: 'If I visit Korea, what food should I try first?',
        ko: '제가 한국에 가면 어떤 음식을 제일 먼저 먹어야 해요?',
        keywords: [/should|try|recommend|bbq|kimchi|tteokbokki|bibimbap|chicken/i],
        replies: ['You should try Korean BBQ first.', 'Tteokbokki! It is spicy but delicious.', 'I recommend bibimbap.'],
        onMatch: "I'm writing that down right now!",
      },
    ],
  },
  {
    id: 'travel',
    title: '여행',
    exchanges: [
      {
        say: 'I love traveling. Have you ever been abroad?',
        ko: '저는 여행을 좋아해요. 해외에 가 본 적 있어요?',
        keywords: [/have been|went to|visited|never|japan|europe|america|yes|no/i],
        replies: ['Yes, I have been to Japan.', 'I visited Europe two years ago.', 'Not yet, but I really want to.'],
      },
      {
        say: "If you could fly anywhere tomorrow, where would you go?",
        ko: '내일 당장 어디든 갈 수 있다면, 어디로 가고 싶어요?',
        keywords: [/would|go to|want|paris|hawaii|york|london|anywhere/i],
        replies: ['I would go to Paris.', 'Hawaii! I need a beach.', 'New York. I want to see Times Square.'],
        onMatch: 'Excellent choice. Take me with you!',
      },
      {
        say: 'Do you prefer the beach or the mountains?',
        ko: '바다가 좋아요, 산이 좋아요?',
        keywords: [/beach|mountain|prefer|both|sea/i],
        replies: ['I prefer the beach.', 'Mountains, for sure. I love hiking.', 'Honestly, I like both.'],
      },
    ],
  },
  {
    id: 'daily',
    title: '하루 일과',
    exchanges: [
      {
        say: 'Walk me through your typical day. What time do you usually get up?',
        ko: '평범한 하루를 설명해 줘요. 보통 몇 시에 일어나요?',
        keywords: [/get up|wake|at (six|seven|eight|nine)|o'?clock|am\b/i],
        replies: ['I usually get up at seven.', 'I wake up at six and go for a run.', 'Around eight, sometimes later.'],
      },
      {
        say: 'Are you a morning person or a night owl?',
        ko: '아침형 인간이에요, 저녁형 인간이에요?',
        keywords: [/morning|night|owl|person|both|neither/i],
        replies: ["I'm definitely a morning person.", "A night owl. I focus better at night.", 'Neither. I am always sleepy!'],
        onMatch: 'Haha, I feel that!',
      },
      {
        say: 'What was the best part of your day today?',
        ko: '오늘 하루 중 가장 좋았던 순간은 뭐였어요?',
        keywords: ANY,
        replies: ['Talking with you right now!', 'I had a really good lunch.', 'I finished my work early today.'],
        onMatch: 'Aww, that made my day too.',
      },
    ],
  },
  {
    id: 'weather',
    title: '날씨와 계절',
    exchanges: [
      {
        say: "How's the weather over there today?",
        ko: '거기 오늘 날씨는 어때요?',
        keywords: [/sunny|rainy|cloudy|hot|cold|warm|snow|nice|weather/i],
        replies: ["It's sunny and warm today.", "It's raining a lot here.", 'Pretty cold. Winter is coming.'],
      },
      {
        say: "What's your favorite season, and why?",
        ko: '가장 좋아하는 계절이 뭐예요? 이유는요?',
        keywords: [/spring|summer|fall|autumn|winter|because/i],
        replies: ['I love spring because of the flowers.', 'Fall. The weather is perfect.', 'Winter, because I love snow.'],
        onMatch: 'Beautiful choice. Every season has its magic.',
      },
    ],
  },
  {
    id: 'work',
    title: '일과 공부',
    exchanges: [
      {
        say: 'So what do you do? Do you work or study?',
        ko: '무슨 일을 해요? 일하고 있어요, 공부하고 있어요?',
        keywords: [/work|study|student|job|company|school|office/i],
        replies: ['I work at a small company.', "I'm a university student.", 'I study design and work part time.'],
      },
      {
        say: 'What do you like most about it?',
        ko: '그 일에서 가장 좋은 점은 뭐예요?',
        keywords: [/like|love|enjoy|people|learn|free|interesting/i],
        replies: ['I like my coworkers. They are fun.', 'I love learning new things.', 'The free coffee, honestly!'],
        onMatch: "Haha, that's a solid answer.",
      },
      {
        say: 'Why are you learning English, by the way?',
        ko: '그런데 영어는 왜 배우고 있어요?',
        keywords: [/travel|work|job|movie|talk|friend|study|because/i],
        replies: ['I want to travel without translation apps.', 'For my job. I need it for meetings.', 'I want to watch movies without subtitles.'],
        onMatch: "That's a fantastic reason. And you're getting better every day!",
      },
    ],
  },
  {
    id: 'weekend',
    title: '주말 계획',
    exchanges: [
      {
        say: 'Any plans for the weekend?',
        ko: '주말에 계획 있어요?',
        keywords: [/going to|will|plan|meet|watch|rest|sleep|nothing/i],
        replies: ["I'm going to meet my friends.", 'I will just rest at home.', 'No plans yet. Maybe a movie?'],
      },
      {
        say: 'Sounds good! Who are you usually with on weekends?',
        ko: '좋네요! 주말에는 보통 누구와 함께 있어요?',
        keywords: [/friend|family|alone|myself|girlfriend|boyfriend|dog|cat/i],
        replies: ['Usually with my family.', 'With my friends, mostly.', 'Alone with my cat. Perfect weekend!'],
        onMatch: 'That sounds so cozy.',
      },
    ],
  },
  {
    id: 'media',
    title: '영화와 음악',
    exchanges: [
      {
        say: 'Seen anything good lately? A movie or a show?',
        ko: '최근에 좋은 영화나 드라마 봤어요?',
        keywords: [/watched|saw|movie|show|drama|series|netflix/i],
        replies: ['I watched a great action movie last week.', "I'm watching a drama these days.", 'Nothing lately. Any recommendations?'],
      },
      {
        say: 'What kind of music do you listen to?',
        ko: '어떤 음악을 들어요?',
        keywords: [/pop|rock|jazz|hip ?hop|kpop|classical|listen|music/i],
        replies: ['I listen to K-pop a lot.', 'Mostly pop and hip hop.', 'Jazz, especially at night.'],
        onMatch: 'Great taste! Send me a playlist sometime.',
      },
    ],
  },
  {
    id: 'dream',
    title: '꿈과 목표',
    exchanges: [
      {
        say: "Here's a big question. What's a goal you have this year?",
        ko: '큰 질문 하나 할게요. 올해 목표가 뭐예요?',
        keywords: [/want to|goal|plan to|hope|dream|will/i],
        replies: ['I want to speak English fluently.', 'My goal is to exercise three times a week.', 'I plan to save money and travel.'],
        onMatch: "I love that goal. You're already working on it right now!",
      },
      {
        say: 'If money were no problem, what would you do with your life?',
        ko: '돈이 문제가 아니라면, 인생에서 뭘 하고 싶어요?',
        keywords: [/would|travel|open|build|help|live|buy/i],
        replies: ['I would travel around the world.', 'I would open a small bakery.', 'I would just rest on a quiet island.'],
        onMatch: 'That sounds like a beautiful life.',
      },
    ],
  },
  {
    id: 'korea',
    title: '한국 소개하기',
    exchanges: [
      {
        say: "I've never been to Korea. What should I see in Seoul first?",
        ko: '저는 한국에 가 본 적이 없어요. 서울에서 뭘 제일 먼저 봐야 해요?',
        keywords: [/palace|han river|namsan|market|should|visit|see/i],
        replies: ['You should visit Gyeongbok Palace.', 'Walk along the Han River at night.', 'Namsan Tower has the best view.'],
        onMatch: 'Adding it to my bucket list right now!',
      },
      {
        say: 'What do you love most about living in Korea?',
        ko: '한국에 사는 것의 가장 좋은 점은 뭐라고 생각해요?',
        keywords: [/food|safe|fast|delivery|people|convenient|love/i],
        replies: ['The food delivery is super fast.', 'It is very safe, even at night.', 'Cafes everywhere. I love it.'],
        onMatch: 'Okay, now I really have to visit.',
      },
    ],
  },
  {
    id: 'wrapup',
    title: '마무리 스몰토크',
    exchanges: [
      {
        say: "You're doing amazing today. Was this conversation hard for you?",
        ko: '오늘 정말 잘하고 있어요. 이 대화가 어려웠어요?',
        keywords: [/easy|hard|difficult|fun|okay|little|bit/i],
        replies: ['A little hard, but fun!', 'It was okay. I enjoyed it.', 'Very difficult, but I tried my best.'],
        onMatch: "Trying is everything. Seriously, great job.",
      },
      {
        say: "One last one. Teach me a Korean word, and tell me what it means in English!",
        ko: '마지막이에요. 저에게 한국어 단어 하나를 알려주고, 영어로 무슨 뜻인지 말해 줘요!',
        keywords: [/means|is\b|word/i],
        replies: ['Saranghae means I love you.', 'Gamsahamnida means thank you.', 'Daebak means awesome.'],
        onMatch: "Ooh, I'm going to use that every day now!",
      },
    ],
  },
];

// ── 상황극 시나리오 (역할극: 튜터가 상대 역을 연기) ──
const CAFE = {
  id: 'cafe',
  title: '카페에서 주문',
  exchanges: [
    {
      say: "Welcome to Emma's Coffee! What can I get for you today?",
      ko: '엠마스 커피에 오신 걸 환영해요! 오늘 뭘 드릴까요?',
      keywords: [/can i (get|have)|i'?d like|i will have|latte|coffee|americano|tea/i],
      replies: ['Can I get an iced americano, please?', "I'd like a latte, please.", 'One hot chocolate, please.'],
      onMatch: 'Great choice! Anything else with that?',
    },
    {
      say: 'Would you like that for here or to go?',
      ko: '매장에서 드시나요, 포장인가요?',
      keywords: [/for here|to go|takeaway|take away/i],
      replies: ['For here, please.', 'To go, please.', 'To go. I am in a hurry.'],
    },
    {
      say: "That'll be five dollars. How would you like to pay?",
      ko: '5달러입니다. 어떻게 결제하시겠어요?',
      keywords: [/card|cash|credit|by|pay with/i],
      replies: ["I'll pay by card.", 'Cash, please.', 'Can I pay with my phone?'],
      onMatch: 'Perfect, all set!',
    },
    {
      say: 'Your drink will be ready at the counter. Anything else I can help with?',
      ko: '음료는 카운터에서 준비될 거예요. 더 도와드릴 게 있을까요?',
      keywords: [/no thanks|that'?s all|nothing|thank you|actually/i],
      replies: ["No, that's all. Thank you!", 'Actually, can I get a receipt?', "Nothing else, thanks a lot."],
      onMatch: 'Enjoy your drink! Have a wonderful day.',
    },
  ],
};

const INTERVIEW = {
  id: 'interview',
  title: '영어 면접',
  exchanges: [
    {
      say: "Thanks for coming in today. To start, could you tell me a little about yourself?",
      ko: '와 주셔서 감사해요. 먼저, 자기소개를 간단히 해 주시겠어요?',
      keywords: [/i'?m|i am|my name|i have|i work|i studied|graduated/i],
      replies: ["I'm Mina, and I have three years of marketing experience.", 'I am a recent graduate with a passion for design.', 'I have worked in sales for five years.'],
      onMatch: "Wonderful, thanks for that introduction.",
    },
    {
      say: 'What would you say is your greatest strength?',
      ko: '본인의 가장 큰 강점은 무엇이라고 생각하세요?',
      keywords: [/strength|good at|i'?m|hardworking|creative|team|detail|communication/i],
      replies: ['I am very detail oriented.', 'My greatest strength is communication.', "I'm a fast learner and a team player."],
      onMatch: "That's exactly what we're looking for.",
    },
    {
      say: 'Why do you want to work with us?',
      ko: '왜 저희 회사에서 일하고 싶으신가요?',
      keywords: [/because|company|culture|product|grow|mission|love|admire/i],
      replies: ['Because I love your products.', 'Your company culture inspires me.', 'I want to grow with a global team.'],
      onMatch: 'Great answer. We like people with clear motivation.',
    },
    {
      say: 'Where do you see yourself in five years?',
      ko: '5년 후에 어떤 모습일 것 같으세요?',
      keywords: [/in five years|i see|i want|leading|manager|expert|hope/i],
      replies: ['I see myself leading a small team.', 'I want to be an expert in this field.', 'Hopefully growing together with this company.'],
      onMatch: 'I love that ambition. Thanks for sharing.',
    },
    {
      say: "Last one. Do you have any questions for me?",
      ko: '마지막이에요. 저에게 궁금한 점 있으세요?',
      keywords: [/what|when|how|question|team|start|culture/i],
      replies: ['What does a typical day look like here?', 'How big is the team?', 'When can I start?'],
      onMatch: "Haha, great question. We'll be in touch very soon!",
    },
  ],
};

const TRAVEL_SCENE = {
  id: 'travelScene',
  title: '여행 상황극 — 호텔 체크인',
  exchanges: [
    {
      say: 'Good evening! Welcome to the Grand Hotel. How can I help you?',
      ko: '안녕하세요! 그랜드 호텔에 오신 것을 환영합니다. 어떻게 도와드릴까요?',
      keywords: [/check in|reservation|booked|room|under the name/i],
      replies: ["Hi, I'd like to check in.", 'I have a reservation under Kim.', 'I booked a room for two nights.'],
      onMatch: 'Of course, let me look that up for you.',
    },
    {
      say: 'I found your booking. Could I see your passport, please?',
      ko: '예약을 찾았습니다. 여권을 보여 주시겠어요?',
      keywords: [/here (it is|you (go|are))|sure|of course|passport/i],
      replies: ['Sure, here it is.', 'Of course, here you go.', 'One moment, it is in my bag.'],
    },
    {
      say: 'Thank you. Would you like a room with a city view or an ocean view?',
      ko: '감사합니다. 시티뷰와 오션뷰 중 어떤 방을 원하세요?',
      keywords: [/city|ocean|view|either|cheaper/i],
      replies: ['An ocean view, please!', 'City view is fine.', 'Which one is cheaper?'],
      onMatch: 'Excellent choice.',
    },
    {
      say: "You're all set! Breakfast is from seven to ten. Do you need anything else?",
      ko: '준비 끝났습니다! 조식은 7시부터 10시까지예요. 더 필요하신 것 있나요?',
      keywords: [/wifi|password|time|no thanks|that'?s all|late check ?out|where/i],
      replies: ['What is the wifi password?', 'Can I have a late checkout?', "No, that's all. Thank you!"],
      onMatch: 'My pleasure. Enjoy your stay!',
    },
  ],
};

const DEBATE = {
  id: 'debate',
  title: '가벼운 토론',
  exchanges: [
    {
      say: "Let's debate something fun. Cats or dogs — which make better pets, and why?",
      ko: '재밌는 토론 해요. 고양이 대 강아지 — 어느 쪽이 더 좋은 반려동물이에요? 이유는요?',
      keywords: [/cat|dog|because|better|think/i],
      replies: ['Dogs, because they are loyal and friendly.', 'Cats! They are independent and quiet.', 'I think both are great, honestly.'],
      onMatch: "Strong opening argument! I'm impressed.",
    },
    {
      say: "Interesting! But some people say the other side is easier to take care of. What do you think about that?",
      ko: '흥미롭네요! 그런데 반대쪽이 돌보기 더 쉽다는 사람들도 있어요. 어떻게 생각해요?',
      keywords: [/i (dis)?agree|but|think|point|true|however|still/i],
      replies: ['I disagree. Training makes everything easier.', "That's a fair point, but I still prefer mine.", 'Maybe, but love matters more than easy care.'],
      onMatch: 'Nicely argued. You handled that counterpoint well.',
    },
    {
      say: "New topic. Is it better to live in a big city or the countryside?",
      ko: '새 주제예요. 대도시와 시골 중 어디에 사는 게 더 좋을까요?',
      keywords: [/city|countryside|country|because|prefer|quiet|convenient/i],
      replies: ['A big city, because everything is convenient.', 'The countryside. It is quiet and peaceful.', 'A city for work, the countryside for weekends.'],
      onMatch: "A balanced take — I like it.",
    },
    {
      say: 'Final round. Should everyone learn a second language? Convince me.',
      ko: '마지막 라운드예요. 모두가 제2외국어를 배워야 할까요? 저를 설득해 봐요.',
      keywords: [/yes|should|because|opens|culture|brain|job|world/i],
      replies: ['Yes! It opens doors to new cultures.', 'Absolutely. It is good for your brain and career.', 'Of course. We are talking right now because of it!'],
      onMatch: "Case closed — you win this debate. Well done!",
    },
  ],
};

// ── 시나리오 정의 (로비에서 선택) ──
// topics: 순서대로 진행 후, 소진되면 프리토크 풀에서 무한 계속
export const SCENARIOS = [
  { id: 'free', title: '프리토크', desc: '주제 제한 없이 끝없이 이어지는 대화', topics: TOPICS, endless: true },
  { id: 'smalltalk', title: '스몰토크', desc: '가벼운 일상 대화로 워밍업', topics: TOPICS.slice(0, 6) },
  { id: 'cafe', title: '카페 주문', desc: '바리스타 엠마에게 주문해 보세요', topics: [CAFE] },
  { id: 'interview', title: '영어 면접', desc: '면접관 엠마와 모의 면접', topics: [INTERVIEW] },
  { id: 'travel', title: '여행 상황극', desc: '호텔 체크인 롤플레이', topics: [TRAVEL_SCENE] },
  { id: 'debate', title: '가벼운 토론', desc: '의견을 말하고 반론에 대응하기', topics: [DEBATE] },
];
