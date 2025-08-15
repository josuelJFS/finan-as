import * as LocalAuthentication from "expo-local-authentication";

export interface BiometricSupportInfo {
  canUse: boolean;
  enrolled: boolean;
  types: LocalAuthentication.AuthenticationType[];
  error?: string;
}

export async function checkBiometricSupport(): Promise<BiometricSupportInfo> {
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    if (!hasHardware) return { canUse: false, enrolled: false, types: [] };
    const enrolled = await LocalAuthentication.isEnrolledAsync();
    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    return { canUse: hasHardware && enrolled, enrolled, types };
  } catch (e: any) {
    return { canUse: false, enrolled: false, types: [], error: e?.message };
  }
}

export async function authenticateOnce(reason = "Autenticar"): Promise<boolean> {
  try {
    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: reason,
      disableDeviceFallback: false,
      cancelLabel: "Cancelar",
    });
    return res.success;
  } catch {
    return false;
  }
}
