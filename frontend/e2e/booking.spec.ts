import { expect, type Page, test } from '@playwright/test';

/**
 * A suffix unique to this test run. The server keeps the data of earlier runs, and Event Type names and ids must be
 * unique, so every test names what it creates with it.
 */
function unique() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

/** The Owner creates an Event Type in the admin area. */
async function createEventType(page: Page, { name, id }: { name: string; id: string }) {
  await page.goto('/admin');
  await page.getByRole('textbox', { name: 'Название' }).fill(name);
  await page.getByRole('combobox', { name: 'Длительность' }).selectOption({ label: '15 мин' });
  await page.getByRole('textbox', { name: 'Идентификатор' }).fill(id);
  await page.getByRole('button', { name: 'Создать' }).click();
  await expect(page.getByText(`Тип события «${name}» создан`)).toBeVisible();
}

/**
 * The Guest opens the first day of the calendar that has Free Slots and chooses its first Slot. Time is real, so
 * which day that is depends on when the test runs. Returns the Slot's time as its button shows it, `10:00–10:15`.
 */
async function chooseFirstFreeSlot(page: Page) {
  // Days without Free Slots are disabled; the names of day buttons are dates, `3 ноября 2026`.
  await page
    .getByRole('button', { name: /^\d{1,2} \p{L}+ \d{4}$/u, disabled: false })
    .first()
    .click();
  const slot = page
    .getByRole('list', { name: /время МСК$/ })
    .getByRole('button')
    .first();
  const time = await slot.textContent();
  expect(time).toMatch(/^\d{2}:\d{2}–\d{2}:\d{2}$/);
  await slot.click();
  return time ?? '';
}

async function fillGuest(page: Page, guest: { name: string; email: string }) {
  await page.getByRole('textbox', { name: 'Имя' }).fill(guest.name);
  await page.getByRole('textbox', { name: 'Email' }).fill(guest.email);
}

test('a Guest books the first Free Slot and the Owner sees the Booking among Upcoming Bookings', async ({
  page,
}) => {
  const run = unique();
  const eventType = { name: `Встреча ${run}`, id: `meeting-${run}` };
  const guest = { name: `Гость ${run}`, email: `guest-${run}@example.com` };

  await createEventType(page, eventType);

  await page.goto('/');
  await page.getByRole('banner').getByRole('link', { name: 'Записаться' }).click();
  await page.getByRole('link', { name: eventType.name }).click();
  const time = await chooseFirstFreeSlot(page);
  await fillGuest(page, guest);
  await page.getByRole('button', { name: 'Подтвердить запись' }).click();

  const confirmation = page.getByRole('region', { name: 'Запись подтверждена' });
  await expect(confirmation).toContainText(eventType.name);
  await expect(confirmation).toContainText(`${time} МСК`);

  await page.getByRole('banner').getByRole('link', { name: 'Админка' }).click();
  const booking = page
    .getByRole('table', { name: 'Предстоящие встречи' })
    .getByRole('row')
    .filter({ has: page.getByRole('cell', { name: guest.email }) });
  await expect(booking.getByRole('cell')).toHaveText([
    new RegExp(`, ${time}$`),
    eventType.name,
    guest.name,
    guest.email,
    /, \d{2}:\d{2}$/,
  ]);
});

test('when two tabs choose the same Slot, the second learns it is taken and sees Free Slots without it', async ({
  context,
}) => {
  const run = unique();
  const eventType = { name: `Консультация ${run}`, id: `consultation-${run}` };
  const first = await context.newPage();
  const second = await context.newPage();

  await createEventType(first, eventType);

  await first.goto(`/book/${eventType.id}`);
  await second.goto(`/book/${eventType.id}`);
  const time = await chooseFirstFreeSlot(first);
  expect(await chooseFirstFreeSlot(second)).toBe(time);
  await fillGuest(first, { name: `Первый ${run}`, email: `first-${run}@example.com` });
  await fillGuest(second, { name: `Второй ${run}`, email: `second-${run}@example.com` });

  await first.getByRole('button', { name: 'Подтвердить запись' }).click();
  await expect(first.getByRole('region', { name: 'Запись подтверждена' })).toBeVisible();

  await second.getByRole('button', { name: 'Подтвердить запись' }).click();
  await expect(second.getByRole('alert')).toHaveText('Это время уже занято, выберите другой слот');
  // The same day again, with Free Slots loaded anew; the list may be empty if that Slot was the day's last.
  const slots = second.getByRole('list', { name: /время МСК$/ });
  await expect(slots).toBeAttached();
  await expect(slots.getByRole('button', { name: time })).toHaveCount(0);
});
