export type DemoText = { title: string; place: string; when: string; budget: string };
// Demo examples are shown in the chosen language; ids stay the same and nothing is written to the database.
export const demoRequestText: Record<number, Record<'kk' | 'en', DemoText>> = {
  1428: {
    kk: { title: '70 га бидайды орып-жинайтын комбайн керек', place: 'Көксу ауданы, Жетісу', when: '8 қыркүйекке дейін', budget: 'Келісімді' },
    en: { title: 'Need a combine to harvest 70 ha of wheat', place: 'Koksu district, Zhetisu', when: 'by 8 September', budget: 'Negotiable' },
  },
  1429: {
    kk: { title: 'Кірпіш жеткізу үшін манипулятор іздеймін', place: 'Талдықорған → Еркін', when: 'ертең', budget: '35 000 ₸ дейін' },
    en: { title: 'Looking for a crane truck to deliver bricks', place: 'Taldykorgan → Erkin', when: 'tomorrow', budget: 'up to 35,000 ₸' },
  },
  1430: {
    kk: { title: 'Демалыс күндеріне 5–7 кВт генератор керек', place: 'Текелі', when: '2 күнге', budget: '18 000 ₸ дейін' },
    en: { title: 'Need a 5–7 kW generator for the weekend', place: 'Tekeli', when: 'for 2 days', budget: 'up to 18,000 ₸' },
  },
  1431: {
    kk: { title: '600 кг картон бар — кім қымбатқа алып кетеді?', place: 'Алматы, Алатау ауданы', when: 'осы аптада', budget: 'Бағаңызды ұсыныңыз' },
    en: { title: 'Have 600 kg of cardboard — who will pay more to collect it?', place: 'Almaty, Alatau district', when: 'this week', budget: 'Make an offer' },
  },
};
