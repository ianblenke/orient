#!/bin/bash

set -e

mkdir -p /etc/ssl/private /etc/ssl/certs/
chmod 755 /etc/ssl
chmod 755 /etc/ssl/private /etc/ssl/certs

KEY_FILE=${KEY_FILE:-/etc/ssl/private/default.key}
CERT_FILE=${CERT_FILE:-/etc/ssl/certs/default.crt}
CA_FILE=${CA_FILE:-/etc/ssl/certs/default+ca.crt}

if [ -n "${WILDCARD_SSL_CERTIFICATE}" ]; then
  mkdir -p $(dirname ${KEY_FILE}) $(dirname ${CERT_FILE}) $(dirname ${CA_FILE})

  if [ -n "${WILDCARD_SSL_PRIVATE_KEY}" ]; then
    echo ${WILDCARD_SSL_PRIVATE_KEY} | base64 -d > /etc/ssl/private/wildcard_ssl_private_key.pem
    echo ${WILDCARD_SSL_PRIVATE_KEY} | base64 -d > ${KEY_FILE}
  fi
  if [ -n "${WILDCARD_SSL_CERTIFICATE}" ]; then
    echo ${WILDCARD_SSL_CERTIFICATE} | base64 -d > /etc/ssl/certs/wildcard_ssl_certificate.pem
    echo ${WILDCARD_SSL_CERTIFICATE} | base64 -d >> ${CERT_FILE}
    echo ${WILDCARD_SSL_CA_CHAIN} | base64 -d > /etc/ssl/certs/wildcard_ssl_certificate_and_ca_chain.pem
  fi
  echo "" >> /etc/ssl/certs/wildcard_ssl_certificate_and_ca_chain.pem
  if [ -n "${WILDCARD_SSL_CA_CHAIN}" ]; then
    echo ${WILDCARD_SSL_CA_CHAIN} | base64 -d > ${CA_FILE}
    echo ${WILDCARD_SSL_CA_CHAIN} | base64 -d >> /etc/ssl/certs/wildcard_ssl_certificate_and_ca_chain.pem
  fi
  export SSL_KEY_FILE=/etc/ssl/private/wildcard_ssl_private_key.pem
  export SSL_CERT_FILE=/etc/ssl/certs/wildcard_ssl_certificate_and_ca_chain.pem
fi

COMMAND="${COMMAND:-node server.js}"

echo exec $COMMAND
exec ${COMMAND}
