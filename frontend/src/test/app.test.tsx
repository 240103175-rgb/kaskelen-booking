import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../App';
import { DICTIONARIES } from '../lib/dictionaries';
import { createMockService } from '../services/mockService';

function renderApp(path = '/', api = createMockService({ latency: 0 })) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <App api={api} mock router={false} />
    </MemoryRouter>,
  );
  return api;
}

async function signIn(api: ReturnType<typeof createMockService>, phone: string, name = '') {
  const user = userEvent.setup();
  await user.type(await screen.findByLabelText('Телефон нөмірі'), phone);
  await user.click(screen.getByRole('button', { name: 'Код алу' }));
  await user.type(await screen.findByLabelText('SMS-код'), api.lastCode(phone)!);
  if (name) await user.type(screen.getByLabelText('Атыңыз'), name);
  await user.click(screen.getByRole('button', { name: 'Кіру' }));
}

beforeEach(() => {
  localStorage.clear();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('home', () => {
  it('lists all 15 demo venues and filters by category', async () => {
    renderApp();
    expect(await screen.findAllByTestId('venue-card')).toHaveLength(15);
    await userEvent.click(screen.getAllByRole('button', { name: /Барбершоп/ }).at(-1)!);
    await waitFor(() => expect(screen.getAllByTestId('venue-card')).toHaveLength(2));
  });

  it('searches Cyrillic text case-insensitively and shows the empty state', async () => {
    renderApp('/?q=БАССЕЙН');
    expect(await screen.findByText('Толқын бассейні')).toBeInTheDocument();
    renderApp('/?q=zzzz');
    expect(await screen.findByText(/Ештеңе табылмады/)).toBeInTheDocument();
  });

  it('shows an error with a retry button when the service fails', async () => {
    const api = createMockService({ latency: 0 });
    api.failNext('network', 0);
    renderApp('/', api);
    expect(await screen.findByText(/Серверге қосылу мүмкін болмады/)).toBeInTheDocument();
  });

  it('switches to Russian', async () => {
    renderApp();
    await userEvent.click(await screen.findByRole('button', { name: 'Language' }));
    expect(await screen.findByText('Категории')).toBeInTheDocument();
  });
});

describe('booking flow', () => {
  it('signs in, books a free slot and cancels it', async () => {
    const api = createMockService({ latency: 0 });
    renderApp('/login?next=/venues/2', api);
    await signIn(api, '+77071234567', 'Айдос');
    await screen.findAllByText('1-алаң');
    const free = await waitFor(() => {
      const slots = document.querySelectorAll<HTMLButtonElement>('button.slot-free');
      expect(slots.length).toBeGreaterThan(0);
      return slots;
    });
    await userEvent.click(free[free.length - 1]);
    const card = await screen.findByTestId('booking-card');
    expect(within(card).getByText('Растауды күтуде')).toBeInTheDocument();
    await userEvent.click(within(card).getByRole('button', { name: 'Бас тарту' }));
    expect(await screen.findByText('Бас тартылды')).toBeInTheDocument();
  });

  it('rejects an invalid phone number', async () => {
    renderApp('/login');
    await userEvent.type(await screen.findByLabelText('Телефон нөмірі'), '123');
    await userEvent.click(screen.getByRole('button', { name: 'Код алу' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Нөмір дұрыс емес');
  });

  it('keeps customers out of the business panel', async () => {
    const api = createMockService({ latency: 0 });
    renderApp('/login?next=/owner', api);
    await signIn(api, '+77071234567');
    expect(await screen.findByText('Бет табылмады')).toBeInTheDocument();
  });

  it('lets the owner block an hour', async () => {
    const api = createMockService({ latency: 0 });
    renderApp('/login?next=/owner', api);
    await signIn(api, '+77010000001');
    const blockButtons = await screen.findAllByRole('button', { name: 'Жабу' });
    await userEvent.click(blockButtons[blockButtons.length - 1]);
    expect(await screen.findAllByRole('button', { name: 'Ашу' })).toHaveLength(1);
  });
});

describe('mock service rules', () => {
  it('never exceeds capacity and allows one place per person', async () => {
    const api = createMockService({ latency: 0, now: () => Date.parse('2026-10-13T05:00:00Z') });
    const lane = (await api.getVenue((await api.listVenues({ category: 'pool' }))[0].id)).resources[0];
    const slot = { resourceId: lane.id, date: '2026-10-14', hour: 9 };
    for (let i = 0; i < 4; i++) {
      await api.requestCode(`+7701555000${i}`);
      api.setToken((await api.verifyCode(`+7701555000${i}`, api.lastCode(`+7701555000${i}`)!)).token);
      await api.createBooking(slot);
      if (i === 0) await expect(api.createBooking(slot)).rejects.toMatchObject({ code: 'already_booked' });
    }
    await api.requestCode('+77015550009');
    api.setToken((await api.verifyCode('+77015550009', api.lastCode('+77015550009')!)).token);
    await expect(api.createBooking(slot)).rejects.toMatchObject({ code: 'taken' });
  });

  it('has the same dictionary keys in Kazakh and Russian', () => {
    expect(Object.keys(DICTIONARIES.ru).sort()).toEqual(Object.keys(DICTIONARIES.kk).sort());
  });

  it('refuses hours that would hide an active booking (#41)', async () => {
    const api = createMockService({ latency: 0, now: () => Date.parse('2026-10-13T05:00:00Z') });
    const gp = (await api.listVenues({ q: 'Goal Park' }))[0];
    const [res] = (await api.getVenue(gp.id)).resources;
    await api.requestCode('+77071230041');
    api.setToken((await api.verifyCode('+77071230041', api.lastCode('+77071230041')!)).token);
    await api.createBooking({ resourceId: res.id, date: '2026-10-14', hour: 20 });
    await api.requestCode('+77010000001');
    api.setToken((await api.verifyCode('+77010000001', api.lastCode('+77010000001')!)).token);
    await expect(
      api.updateVenueSettings(gp.id, { openHour: 10, closeHour: 20, dayPrice: 9000, eveningPrice: 14000, eveningStartHour: 19 }),
    ).rejects.toMatchObject({ code: 'hours_conflict' });
  });

  it('saves the language to the signed-in profile', async () => {
    const api = createMockService({ latency: 0 });
    renderApp('/login?next=/', api);
    await signIn(api, '+77071230099');
    await userEvent.click(await screen.findByRole('button', { name: 'Language' }));
    await waitFor(async () => expect((await api.me()).lang).toBe('ru'));
  });
});
