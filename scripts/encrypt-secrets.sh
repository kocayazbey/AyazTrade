#!/bin/bash

#############################
# Kubernetes Secret Encryption Script
# Uses SOPS (Secrets OPerationS) for secret management
#############################

set -e

# Configuration
SECRETS_DIR="k8s/secrets"
ENCRYPTED_SECRETS_DIR="k8s/secrets/encrypted"
SOPS_CONFIG=".sops.yaml"
AGE_KEY_FILE="${HOME}/.config/sops/age/keys.txt"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔐 Kubernetes Secret Encryption Tool${NC}"
echo "================================="

# Check if sops is installed
if ! command -v sops &> /dev/null; then
    echo -e "${RED}❌ SOPS is not installed. Please install SOPS first:${NC}"
    echo "   curl -Lo sops https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.7.3.linux"
    echo "   chmod +x sops"
    echo "   sudo mv sops /usr/local/bin/"
    exit 1
fi

# Check if age is installed
if ! command -v age &> /dev/null; then
    echo -e "${RED}❌ AGE is not installed. Please install AGE first:${NC}"
    echo "   Go to: https://github.com/FiloSottile/age/releases"
    echo "   Download and install age for your platform"
    exit 1
fi

# Generate age key if not exists
if [ ! -f "$AGE_KEY_FILE" ]; then
    echo -e "${YELLOW}🔑 Generating AGE key for encryption...${NC}"
    mkdir -p "${HOME}/.config/sops/age"
    age-keygen -o "$AGE_KEY_FILE"
    echo -e "${GREEN}✅ AGE key generated at: $AGE_KEY_FILE${NC}"
fi

# Create SOPS configuration if not exists
if [ ! -f "$SOPS_CONFIG" ]; then
    echo -e "${YELLOW}⚙️ Creating SOPS configuration...${NC}"
    cat > "$SOPS_CONFIG" << EOF
creation_rules:
  - path_regex: k8s/secrets/.*\.yaml
    age: >-
      $(grep "public key:" "$AGE_KEY_FILE" | head -1 | cut -d' ' -f4)
EOF
    echo -e "${GREEN}✅ SOPS configuration created${NC}"
fi

# Create directories
mkdir -p "$SECRETS_DIR"
mkdir -p "$ENCRYPTED_SECRETS_DIR"

# Function to encrypt secret
encrypt_secret() {
    local secret_file="$1"
    local encrypted_file="$ENCRYPTED_SECRETS_DIR/$(basename "$secret_file")"

    if [ -f "$secret_file" ]; then
        echo -e "${BLUE}🔐 Encrypting: $secret_file${NC}"
        sops --encrypt --in-place "$secret_file"

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Encrypted: $secret_file${NC}"
        else
            echo -e "${RED}❌ Failed to encrypt: $secret_file${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️ Secret file not found: $secret_file${NC}"
    fi
}

# Function to decrypt secret
decrypt_secret() {
    local encrypted_file="$1"
    local secret_file="$SECRETS_DIR/$(basename "$encrypted_file")"

    if [ -f "$encrypted_file" ]; then
        echo -e "${BLUE}🔓 Decrypting: $encrypted_file${NC}"
        sops --decrypt --in-place "$encrypted_file"

        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Decrypted: $encrypted_file${NC}"
        else
            echo -e "${RED}❌ Failed to decrypt: $encrypted_file${NC}"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️ Encrypted file not found: $encrypted_file${NC}"
    fi
}

# Function to create encrypted secret from template
create_secret() {
    local secret_name="$1"
    local secret_file="$SECRETS_DIR/$secret_name.yaml"

    echo -e "${BLUE}📝 Creating secret template: $secret_name${NC}"

    cat > "$secret_file" << EOF
apiVersion: v1
kind: Secret
metadata:
  name: $secret_name
  namespace: ayaztrade
type: Opaque
data:
  # Add your encrypted secrets here
  # Use: echo -n "your-secret-value" | base64
  DB_PASSWORD: ""
  REDIS_PASSWORD: ""
  JWT_SECRET: ""
  STRIPE_SECRET_KEY: ""
  IYZICO_SECRET_KEY: ""
  EMAIL_PASSWORD: ""
  SMS_API_KEY: ""
  AWS_ACCESS_KEY_ID: ""
  AWS_SECRET_ACCESS_KEY: ""
stringData:
  # Plain text secrets (will be encrypted)
  # Remove this section after adding values
  example_secret: "replace_with_actual_secret"
EOF

    echo -e "${GREEN}✅ Secret template created: $secret_file${NC}"
    echo -e "${YELLOW}📝 Please edit the file and add your actual secret values${NC}"
}

# Main menu
case "${1:-help}" in
    "encrypt")
        echo -e "${BLUE}🔐 Encrypting secrets...${NC}"
        encrypt_secret "k8s/secret.yaml"
        echo -e "${GREEN}✅ Encryption completed${NC}"
        ;;
    "decrypt")
        echo -e "${BLUE}🔓 Decrypting secrets...${NC}"
        decrypt_secret "k8s/secrets/encrypted/secret.yaml"
        echo -e "${GREEN}✅ Decryption completed${NC}"
        ;;
    "create")
        if [ -z "$2" ]; then
            echo -e "${RED}❌ Please provide secret name: $0 create <secret-name>${NC}"
            exit 1
        fi
        create_secret "$2"
        ;;
    "reencrypt")
        echo -e "${BLUE}🔄 Re-encrypting all secrets...${NC}"
        # Decrypt first
        decrypt_secret "k8s/secrets/encrypted/secret.yaml"
        # Then encrypt again
        encrypt_secret "k8s/secret.yaml"
        echo -e "${GREEN}✅ Re-encryption completed${NC}"
        ;;
    "rotate")
        echo -e "${BLUE}🔄 Rotating encryption keys...${NC}"
        echo -e "${YELLOW}⚠️ This will generate new encryption keys. Make sure to backup your secrets first!${NC}"
        read -p "Are you sure you want to continue? (yes/no): " CONFIRM

        if [ "$CONFIRM" = "yes" ]; then
            # Generate new age key
            age-keygen -o "$AGE_KEY_FILE.new"
            echo -e "${GREEN}✅ New AGE key generated${NC}"

            # Update SOPS config
            NEW_PUBLIC_KEY=$(grep "public key:" "$AGE_KEY_FILE.new" | head -1 | cut -d' ' -f4)
            sed -i "s/age: >-.*/age: >-\n      $NEW_PUBLIC_KEY/" "$SOPS_CONFIG"

            echo -e "${GREEN}✅ SOPS configuration updated${NC}"
            echo -e "${YELLOW}📝 Please distribute the new public key to your team${NC}"
        fi
        ;;
    "backup")
        echo -e "${BLUE}💾 Creating encrypted backup of secrets...${NC}"
        BACKUP_FILE="secrets-backup-$(date +%Y%m%d-%H%M%S).yaml"
        cp "k8s/secret.yaml" "k8s/secrets/encrypted/$BACKUP_FILE"
        echo -e "${GREEN}✅ Backup created: k8s/secrets/encrypted/$BACKUP_FILE${NC}"
        ;;
    "help"|*)
        echo -e "${BLUE}🔐 Kubernetes Secret Encryption Tool${NC}"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  encrypt     - Encrypt secrets using SOPS"
        echo "  decrypt     - Decrypt secrets for editing"
        echo "  create      - Create new secret template"
        echo "  reencrypt   - Re-encrypt secrets with current keys"
        echo "  rotate      - Rotate encryption keys (⚠️ Destructive!)"
        echo "  backup      - Create encrypted backup of secrets"
        echo "  help        - Show this help message"
        echo ""
        echo "Examples:"
        echo "  $0 encrypt"
        echo "  $0 create database-secrets"
        echo "  $0 decrypt && nano k8s/secret.yaml && $0 encrypt"
        echo ""
        echo -e "${YELLOW}📝 Note: Always backup your secrets before making changes!${NC}"
        ;;
esac
