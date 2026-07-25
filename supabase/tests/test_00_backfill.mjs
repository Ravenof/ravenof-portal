// Migracijų sauga — senas login progresas perkeliamas, o ne trinamas
export async function run(t) {
  const { q, rpc, check, eq, truthy } = t
  const L12 = '60000000-0000-4000-8000-000000000001'
  const L35 = '60000000-0000-4000-8000-000000000002'

  check('senas v1 kalendorius NELIEČIAMAS', () => {
    eq(q(`select count(*) from user_monthly_login where user_id='${L12}'`), '12', 'v1 įrašai išliko')
    eq(q(`select count(*) from user_monthly_login where user_id='${L35}'`), '35', 'v1 įrašai išliko')
  })

  check('12 v1 claim\'ų → naujas ciklas su pozicija 12 (progresas nedingo)', () => {
    eq(q(`select position from user_login_cycles where user_id='${L12}'`), '12', 'pozicija')
    eq(q(`select count(*) from user_login_claims where user_id='${L12}'`), '12', 'claim eilučių')
    eq(q(`select completed_at is null from user_login_cycles where user_id='${L12}'`), 't', 'ciklas aktyvus')
    const s = rpc(L12, `rvn_get_login_cycle()`)
    eq(s.cyclePosition, 12, 'DTO pozicija')
    eq(s.claimableDay, 13, 'kita diena = 13')
  })

  check('35 v1 claim\'ai → ciklas apkarpomas iki 31 ir pažymimas užbaigtu', () => {
    eq(q(`select position from user_login_cycles where user_id='${L35}'`), '31', 'pozicija')
    eq(q(`select count(*) from user_login_claims where user_id='${L35}'`), '31', 'claim eilučių')
    eq(q(`select completed_at is not null from user_login_cycles where user_id='${L35}'`), 't', 'užbaigtas')
  })

  check('backfill idempotentinis (pakartotinis paleidimas nekuria dublikatų)', () => {
    truthy(Number(q(`select count(*) from user_login_cycles where user_id='${L12}'`)) === 1, 'vienas ciklas')
  })

  check('perkeltas progresas leidžia claiminti toliau nuo teisingos dienos', () => {
    const r = rpc(L12, `rvn_claim_login_reward('bf1')`)
    eq(r.claimedDay, 13, 'claimedDay')
    eq(q(`select gold from profiles where id='${L12}'`), '300', '13 diena = 300 Sidabro')
  })
}
