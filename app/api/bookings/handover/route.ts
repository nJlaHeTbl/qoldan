import {
  ensureMarketplaceSchema,
  getMarketplaceDb,
  getViewer,
  serverError,
  unauthorized,
  upsertViewer,
} from '@/lib/server/marketplace-db';
import {
  invalidInput,
  parseJson,
  rentalHandoverInput,
} from '@/lib/server/marketplace-schemas';

type HandoffRow = {
  booking_id: string | null;
  deposit_amount: number | null;
  deposit_received: number | null;
  condition_out: string | null;
  equipment_list: string | null;
  handed_over_at: number | null;
  condition_in: string | null;
  deposit_result:
    | 'not_applicable'
    | 'returned'
    | 'partially_withheld'
    | 'withheld'
    | null;
  return_note: string | null;
  returned_at: number | null;
};

const serializeHandoff = (row: HandoffRow) => ({
  depositAmount: Number(row.deposit_amount || 0),
  depositReceived: Boolean(row.deposit_received),
  conditionOut: row.condition_out || '',
  equipmentList: row.equipment_list || '',
  handedOverAt: Number(row.handed_over_at),
  conditionIn: row.condition_in || '',
  depositResult: row.deposit_result,
  returnNote: row.return_note || '',
  returnedAt: row.returned_at ? Number(row.returned_at) : null,
});

export async function POST(request: Request) {
  const viewer = getViewer(request);
  if (!viewer) return unauthorized();
  try {
    const input = await parseJson(request, rentalHandoverInput);
    await ensureMarketplaceSchema();
    await upsertViewer(viewer);
    const db = getMarketplaceDb();
    const booking = await db
      .prepare(
        `SELECT bookings.id, bookings.status,
                rental_handoffs.booking_id,
                rental_handoffs.deposit_amount,
                rental_handoffs.deposit_received,
                rental_handoffs.condition_out,
                rental_handoffs.equipment_list,
                rental_handoffs.handed_over_at,
                rental_handoffs.condition_in,
                rental_handoffs.deposit_result,
                rental_handoffs.return_note,
                rental_handoffs.returned_at
         FROM bookings
         JOIN listings ON listings.id = bookings.listing_id
         LEFT JOIN rental_handoffs
           ON rental_handoffs.booking_id = bookings.id
         WHERE bookings.id = ? AND listings.owner_id = ?`,
      )
      .bind(input.bookingId, viewer.id)
      .first<HandoffRow & { id: string; status: string }>();
    if (!booking) {
      return Response.json(
        { error: 'Аренда не найдена или принадлежит другому владельцу' },
        { status: 404 },
      );
    }
    if (booking.status !== 'accepted') {
      return Response.json(
        { error: 'Акт доступен только для подтверждённой аренды' },
        { status: 409 },
      );
    }

    if (input.action === 'handover') {
      if (booking.handed_over_at) {
        return Response.json(
          { error: 'Передача уже зафиксирована и не может быть переписана' },
          { status: 409 },
        );
      }
      const now = Date.now();
      const depositReceived = input.depositAmount > 0 && input.depositReceived;
      const created = await db
        .prepare(
          `INSERT OR IGNORE INTO rental_handoffs
           (booking_id, deposit_amount, deposit_received, condition_out,
            equipment_list, handed_over_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          booking.id,
          input.depositAmount,
          depositReceived ? 1 : 0,
          input.conditionOut,
          input.equipmentList || null,
          now,
          now,
        )
        .run();
      if (!created.meta.changes) {
        return Response.json(
          { error: 'Передача уже была зафиксирована' },
          { status: 409 },
        );
      }
      return Response.json({
        bookingId: booking.id,
        status: booking.status,
        handoff: serializeHandoff({
          booking_id: booking.id,
          deposit_amount: input.depositAmount,
          deposit_received: depositReceived ? 1 : 0,
          condition_out: input.conditionOut,
          equipment_list: input.equipmentList,
          handed_over_at: now,
          condition_in: null,
          deposit_result: null,
          return_note: null,
          returned_at: null,
        }),
      });
    }

    if (!booking.handed_over_at || !booking.booking_id) {
      return Response.json(
        { error: 'Сначала зафиксируйте передачу вещи арендатору' },
        { status: 409 },
      );
    }
    if (booking.returned_at) {
      return Response.json(
        { error: 'Возврат уже зафиксирован' },
        { status: 409 },
      );
    }
    const hadDeposit =
      Boolean(booking.deposit_received) && Number(booking.deposit_amount) > 0;
    if (hadDeposit && input.depositResult === 'not_applicable') {
      return Response.json(
        { error: 'Укажите, что произошло с полученным залогом' },
        { status: 400 },
      );
    }
    if (!hadDeposit && input.depositResult !== 'not_applicable') {
      return Response.json(
        { error: 'Для аренды без залога выберите «Залога не было»' },
        { status: 400 },
      );
    }
    const completedAt = Date.now();
    const [handoffUpdate, bookingUpdate] = await db.batch([
      db
        .prepare(
          `UPDATE rental_handoffs
           SET condition_in = ?, deposit_result = ?, return_note = ?,
               returned_at = ?, updated_at = ?
           WHERE booking_id = ? AND returned_at IS NULL`,
        )
        .bind(
          input.conditionIn,
          input.depositResult,
          input.returnNote || null,
          completedAt,
          completedAt,
          booking.id,
        ),
      db
        .prepare(
          `UPDATE bookings
           SET status = 'completed', completed_at = ?
           WHERE id = ? AND status = 'accepted'`,
        )
        .bind(completedAt, booking.id),
    ]);
    if (!handoffUpdate.meta.changes || !bookingUpdate.meta.changes) {
      return Response.json(
        { error: 'Статус аренды уже изменился' },
        { status: 409 },
      );
    }
    return Response.json({
      bookingId: booking.id,
      status: 'completed',
      completedAt,
      handoff: serializeHandoff({
        ...booking,
        condition_in: input.conditionIn,
        deposit_result: input.depositResult,
        return_note: input.returnNote,
        returned_at: completedAt,
      }),
    });
  } catch (error) {
    try {
      return invalidInput(error);
    } catch {
      return serverError(error);
    }
  }
}
