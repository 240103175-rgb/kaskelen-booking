// Synthetic demo data. Names and addresses are made up.
// Keep in sync with frontend/src/services/mockData.ts.
export const DEMO_OWNER_PHONE = '+77010000001';

// [category, name, address, description, open, close, dayPrice, eveningPrice, eveningStart, [[resource, capacity]]]
export const SEED_VENUES = [
  ['football', 'Арена Қаскелең', 'Наурызбай батыр көшесі, 12', 'Жасанды шөбі бар екі жабық алаң, киім ауыстыратын бөлме және душ.', 8, 24, 8000, 12000, 18, [['1-алаң', 1], ['2-алаң', 1]]],
  ['football', 'Goal Park', 'Тәуелсіздік көшесі, 3', 'Мини-футбол және 7×7 алаңдары, кешке жарықтандыру.', 10, 24, 9000, 14000, 19, [['Мини-футбол 5×5', 1], ['Футбол 7×7', 1]]],
  ['barbershop', 'Sharp Barber', 'Абылай хан көшесі, 27', 'Ерлер шаш үлгісі, сақал күтімі, балаларға арналған қиу.', 10, 21, 4000, 5000, 18, [['Шебер Арман', 1], ['Шебер Дәулет', 1], ['Шебер Ерлан', 1]]],
  ['barbershop', 'Old Town Barber', 'Жамбыл көшесі, 8', 'Классикалық қиу және ыстық сүлгімен қырыну.', 9, 20, 3500, 3500, 18, [['Шебер Нұрлан', 1], ['Шебер Аслан', 1]]],
  ['beauty', 'Ару сұлулық салоны', 'Райымбек көшесі, 15', 'Шаштараз, маникюр, педикюр және косметолог бір жерде.', 9, 21, 5000, 6000, 18, [['Шаштараз', 1], ['Маникюр', 1], ['Косметолог', 1]]],
  ['beauty', 'Lotus Beauty', 'Сүйінбай көшесі, 41', 'Бояу, күтім процедуралары, қас пен кірпік.', 10, 20, 6000, 6000, 18, [['Стилист', 1], ['Қас пен кірпік', 1]]],
  ['massage', 'Relax массаж студиясы', 'Тәуелсіздік көшесі, 19', 'Классикалық, спорттық және релакс массаж. Сеанс — 1 сағат.', 10, 22, 9000, 11000, 18, [['1-кабинет', 1], ['2-кабинет', 1]]],
  ['massage', 'Шипа SPA', 'Абай көшесі, 5', 'Арқа массажы, тас терапиясы, хамам рәсімдері.', 11, 21, 12000, 12000, 18, [['SPA бөлмесі', 1]]],
  ['pool', 'Толқын бассейні', 'Жансүгіров көшесі, 30', '25 метрлік бассейн, жол бойынша жазылу. Бір сағат — бір адамға.', 7, 22, 2500, 3000, 17, [['1-жол', 4], ['2-жол', 4], ['3-жол', 4]]],
  ['sauna', 'Қарағай моншасы', 'Наурызбай батыр көшесі, 44', 'Фин саунасы мен орыс моншасы, демалыс бөлмесі, шай. Бүкіл бөлме сіздікі.', 12, 24, 10000, 14000, 18, [['Фин саунасы (8 адам)', 1], ['Орыс моншасы (6 адам)', 1]]],
  ['sauna', 'Ыстық су моншасы', 'Төле би көшесі, 9', 'Шағын жеке монша, бассейн және караоке.', 14, 24, 12000, 15000, 19, [['VIP бөлме', 1]]],
  ['gym', 'Power Gym', 'Абылай хан көшесі, 60', 'Тренажер залы және еркін салмақтар. Бір сағатқа жазылу.', 7, 23, 1500, 2000, 17, [['Тренажер залы', 20]]],
  ['gym', 'Fit Life', 'Райымбек көшесі, 2', 'Йога, функционалдық жаттығулар және тренажерлер.', 8, 22, 2000, 2500, 18, [['Тренажер залы', 15], ['Йога залы', 10]]],
  ['restaurant', 'Алатау мейрамханасы', 'Тәуелсіздік көшесі, 1', 'Ұлттық және еуропалық ас мәзірі. Үстелді алдын ала брондау тегін.', 11, 24, 0, 0, 18, [['Үстел 1 (2 адам)', 1], ['Үстел 2 (4 адам)', 1], ['Үстел 3 (6 адам)', 1], ['VIP бөлме (12 адам)', 1]]],
  ['restaurant', 'Kaskelen Grill', 'Жамбыл көшесі, 22', 'Гриль, бургерлер және отбасылық кешкі ас. Брондау тегін.', 12, 24, 0, 0, 18, [['Терраса үстелі', 1], ['Зал үстелі (4 адам)', 1], ['Зал үстелі (8 адам)', 1]]],
];

/** Fills an empty repository with the demo owner and venues. Returns false if venues already exist. */
export async function seed(repo, now = Date.now()) {
  if ((await repo.countVenues()) > 0) return false;
  const owner =
    (await repo.findUserByPhone(DEMO_OWNER_PHONE)) ??
    (await repo.createUser({ phone: DEMO_OWNER_PHONE, name: 'Ерлан', role: 'owner', lang: 'kk', createdAt: now }));
  for (const [category, name, address, description, openHour, closeHour, dayPrice, eveningPrice, eveningStartHour, resources] of SEED_VENUES) {
    const venue = await repo.createVenue({ category, name, address, description, openHour, closeHour, dayPrice, eveningPrice, eveningStartHour, ownerId: owner.id });
    for (const [resourceName, capacity] of resources) await repo.createResource({ venueId: venue.id, name: resourceName, capacity });
  }
  return true;
}
