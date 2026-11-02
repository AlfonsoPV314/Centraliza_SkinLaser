/** Contraseña temporal que cumple los requisitos (mayúscula, minúscula, número, símbolo, 10+). */
export function contrasenaTemporal() {
  const al = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length]
  const base = [al("ABCDEFGHJKLMNPQRSTUVWXYZ"), al("abcdefghijkmnopqrstuvwxyz"), al("23456789"), al("#$%&*!?")]
  for (let i = 0; i < 8; i++) base.push(al("ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"))
  return base.sort(() => (crypto.getRandomValues(new Uint8Array(1))[0] > 127 ? 1 : -1)).join("")
}
