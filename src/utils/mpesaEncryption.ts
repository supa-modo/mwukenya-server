import NodeRSA from "node-rsa";
import { config } from "../config";
import logger from "./logger";

/**
 * M-Pesa Security Credential Encryption Utility
 * Handles RSA encryption of initiator password using M-Pesa's public key
 */
export class MpesaEncryption {
  private static instance: MpesaEncryption;
  private publicKey: NodeRSA | null = null;

  private constructor() {
    this.initializePublicKey();
  }

  public static getInstance(): MpesaEncryption {
    if (!MpesaEncryption.instance) {
      MpesaEncryption.instance = new MpesaEncryption();
    }
    return MpesaEncryption.instance;
  }

  /**
   * Initialize M-Pesa public key for encryption
   */
  private initializePublicKey(): void {
    try {
      const publicKeyString = config.external.mpesa.publicKey;

      if (!publicKeyString) {
        logger.warn(
          "M-Pesa public key not configured. Using placeholder encryption."
        );
        return;
      }

      logger.info("Initializing M-Pesa public key", {
        keyLength: publicKeyString.length,
        keyPreview: publicKeyString.substring(0, 50) + "...",
        hasBeginHeader: publicKeyString.includes("-----BEGIN"),
        hasEndHeader: publicKeyString.includes("-----END"),
        isCertificate: publicKeyString.includes("-----BEGIN CERTIFICATE-----"),
        isPublicKey: publicKeyString.includes("-----BEGIN PUBLIC KEY-----"),
      });

      // Check if this is a certificate instead of a public key
      if (publicKeyString.includes("-----BEGIN CERTIFICATE-----")) {
        throw new Error(
          "You have provided a CERTIFICATE instead of a PUBLIC KEY. " +
            "M-Pesa requires the public key extracted from the certificate. " +
            "Please download the PUBLIC KEY (.pem) file from M-Pesa Daraja API, not the certificate."
        );
      }

      // M-Pesa public key format
      const formattedKey = this.formatPublicKey(publicKeyString);

      this.publicKey = new NodeRSA();
      this.publicKey.importKey(formattedKey, "public");

      logger.info("M-Pesa public key initialized successfully", {
        keySize: this.publicKey.getKeySize(),
      });
    } catch (error: any) {
      logger.error("Failed to initialize M-Pesa public key:", {
        error: error.message,
        stack: error.stack,
        publicKeyLength: config.external.mpesa.publicKey?.length || 0,
        publicKeyPreview:
          config.external.mpesa.publicKey?.substring(0, 100) || "Not set",
      });
      this.publicKey = null;
    }
  }

  /**
   * Format M-Pesa public key to proper PEM format
   */
  private formatPublicKey(keyString: string): string {
    try {
      // Remove any existing formatting and normalize
      let cleanKey = keyString
        .replace(/\\n/g, "\n") // Replace literal \n with actual newlines
        .replace(/\r\n/g, "\n") // Replace Windows line endings
        .replace(/\r/g, "\n") // Replace Mac line endings
        .trim();

      // Remove any existing PEM headers and footers
      cleanKey = cleanKey
        .replace(/-----BEGIN PUBLIC KEY-----/g, "")
        .replace(/-----END PUBLIC KEY-----/g, "")
        .replace(/-----BEGIN RSA PUBLIC KEY-----/g, "")
        .replace(/-----END RSA PUBLIC KEY-----/g, "")
        .trim();

      // Remove all whitespace and newlines from the key content
      cleanKey = cleanKey.replace(/\s+/g, "");

      // Validate that we have a reasonable key length
      if (cleanKey.length < 100) {
        throw new Error("Public key appears to be too short");
      }

      // Add proper PEM headers
      const formattedKey = `-----BEGIN PUBLIC KEY-----\n${cleanKey}\n-----END PUBLIC KEY-----`;

      logger.info("M-Pesa public key formatted successfully", {
        originalLength: keyString.length,
        cleanedLength: cleanKey.length,
        formattedLength: formattedKey.length,
      });

      return formattedKey;
    } catch (error: any) {
      logger.error("Error formatting M-Pesa public key:", error);
      throw new Error(`Failed to format M-Pesa public key: ${error.message}`);
    }
  }

  /**
   * Encrypt initiator password using M-Pesa public key
   */
  public encryptInitiatorPassword(password: string): string {
    try {
      if (!this.publicKey) {
        logger.warn(
          "M-Pesa public key not available. Using placeholder encryption."
        );
        return this.generatePlaceholderCredential(password);
      }

      // Encrypt the password
      const encrypted = this.publicKey.encrypt(password, "base64");

      logger.info("Initiator password encrypted successfully");
      return encrypted;
    } catch (error: any) {
      logger.error("Failed to encrypt initiator password:", error);
      return this.generatePlaceholderCredential(password);
    }
  }

  /**
   * Generate placeholder credential for development/testing
   * This should NOT be used in production
   */
  private generatePlaceholderCredential(password: string): string {
    if (config.env === "production") {
      throw new Error(
        "M-Pesa public key must be configured for production environment"
      );
    }

    logger.warn("Using placeholder encryption for development environment");

    // Simple base64 encoding for development (NOT SECURE)
    return Buffer.from(password).toString("base64");
  }

  /**
   * Validate M-Pesa configuration for production
   */
  public validateProductionConfig(): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required production settings
    if (
      !config.external.mpesa.initiatorName ||
      config.external.mpesa.initiatorName === "testapi"
    ) {
      errors.push(
        "MPESA_INITIATOR_NAME must be set to production initiator name"
      );
    }

    if (!config.external.mpesa.initiatorPassword) {
      errors.push("MPESA_INITIATOR_PASSWORD must be set");
    }

    if (!config.external.mpesa.publicKey) {
      errors.push("MPESA_PUBLIC_KEY must be set for production");
    }

    // Check environment-specific settings
    if (
      config.external.mpesa.environment === "sandbox" &&
      config.env === "production"
    ) {
      warnings.push("M-Pesa environment is set to sandbox in production");
    }

    if (
      config.external.mpesa.paybillNumber === "174379" &&
      config.env === "production"
    ) {
      warnings.push("Using default sandbox paybill number in production");
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get production-ready security credential
   */
  public getSecurityCredential(): string {
    const initiatorPassword = config.external.mpesa.initiatorPassword;

    if (!initiatorPassword) {
      throw new Error("M-Pesa initiator password not configured");
    }

    return this.encryptInitiatorPassword(initiatorPassword);
  }
}

export default MpesaEncryption.getInstance();
