// 자유응답 대화 프롬프트 (상위 섹션 레슨용 — 정해진 답 없이 영어로 대답)
// tier = 섹션 인덱스(0-based). 4 이상(B1+/B2/C1)에서 출제된다.
export const DIALOGUE_PROMPTS = {
  4: [
    { say: 'What would you do if you won the lottery?', ko: '복권에 당첨되면 뭘 할 거예요?', keywords: [/would|buy|travel|quit|save|give/i], sample: 'I would travel the world with my family.' },
    { say: 'Tell me about a problem you solved at work or school.', ko: '일이나 학교에서 해결했던 문제를 말해 주세요.', keywords: [/solved|fixed|problem|when|had to/i], sample: 'Our project was late, so I made a new plan and we finished on time.' },
    { say: 'Recommend me a movie and tell me why you like it.', ko: '영화를 하나 추천하고 이유를 말해 주세요.', keywords: [/recommend|should watch|because|love|story/i], sample: 'You should watch Parasite because the story is full of surprises.' },
    { say: 'What did you use to do as a child that you miss now?', ko: '어릴 때 하던 것 중 지금 그리운 게 있나요?', keywords: [/used to|miss|when i was/i], sample: 'I used to play outside all day, and I really miss that.' },
  ],
  5: [
    { say: 'To be honest, what is the hardest part of learning English for you?', ko: '솔직히, 영어 배우기에서 가장 어려운 부분이 뭐예요?', keywords: [/hardest|difficult|listening|speaking|grammar|honestly/i], sample: 'To be honest, listening is the hardest part for me.' },
    { say: 'Would you mind telling me about your best trip ever?', ko: '지금까지 최고의 여행에 대해 말해 줄래요?', keywords: [/trip|went|visited|best|amazing/i], sample: 'My best trip was to Jeju. The ocean was unbelievable.' },
    { say: "Long story short, what happened on your busiest day this year?", ko: '간단히 말해서, 올해 가장 바빴던 날 무슨 일이 있었어요?', keywords: [/long story short|busy|had to|meetings|deadline/i], sample: 'Long story short, I had three deadlines and survived on coffee.' },
    { say: 'How would you politely turn down an invitation from a friend?', ko: '친구의 초대를 정중하게 거절한다면 어떻게 말할래요?', keywords: [/i'?d love to but|afraid|sorry|maybe next time|rain check/i], sample: "I'd love to, but I already have plans. Rain check?" },
  ],
  6: [
    { say: 'Some say technology brings people together; others disagree. Where do you stand?', ko: '기술이 사람들을 이어준다는 의견과 아니라는 의견이 있어요. 당신의 입장은요?', keywords: [/i (would )?argue|stand|believe|whereas|on the other hand|depends/i], sample: 'I would argue it connects us, whereas it can also isolate us at times.' },
    { say: 'Describe a piece of art or music that genuinely moved you.', ko: '진심으로 감동받았던 예술 작품이나 음악을 묘사해 주세요.', keywords: [/moved|touching|masterpiece|profound|struck/i], sample: 'The film was so profound that it stayed with me for weeks.' },
    { say: 'If you could change one thing about society, what would it be and why?', ko: '사회에서 한 가지를 바꿀 수 있다면, 무엇을 왜 바꾸겠어요?', keywords: [/would change|inequality|education|environment|because/i], sample: 'I would improve education, because it presumably solves many other problems.' },
    { say: 'Tell me a short story that begins with: You will never believe what happened.', ko: '"You will never believe what happened."로 시작하는 짧은 이야기를 들려주세요.', keywords: [/never believe|happened|suddenly|turned out/i], sample: 'You will never believe what happened. My cat opened the door by itself.' },
  ],
};
