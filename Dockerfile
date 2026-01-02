# アクリルスタンド工房 - Docker イメージ
# PHP 8.1 + Apache + 必要な拡張機能
# Optimized for Google Cloud Run deployment

FROM php:8.1-apache

# メンテナ情報
LABEL maintainer="アクリルスタンド工房 <info@zyniqo.co.jp>"
LABEL description="Acrylic Stand Workshop - PHP Application Container"
LABEL org.opencontainers.image.source="https://github.com/Unlce/akuriru-stand"

# 環境変数の設定
ENV APP_ENV=production
ENV DEBUG_MODE=false
ENV APACHE_DOCUMENT_ROOT=/var/www/html
ENV PORT=8080

# システムパッケージの更新と必要なツールのインストール
RUN apt-get update && apt-get install -y \
    libzip-dev \
    libpng-dev \
    libjpeg-dev \
    libfreetype6-dev \
    libonig-dev \
    libxml2-dev \
    zip \
    unzip \
    git \
    curl \
    && rm -rf /var/lib/apt/lists/*

# PHP 拡張機能のインストール
RUN docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j$(nproc) \
        pdo \
        pdo_mysql \
        mysqli \
        gd \
        zip \
        mbstring \
        xml \
        opcache

# Composer のインストール
COPY --from=composer:latest /usr/bin/composer /usr/bin/composer

# Apache モジュールの有効化
RUN a2enmod rewrite headers expires

# Apache 設定のカスタマイズ
RUN echo "ServerName localhost" >> /etc/apache2/apache2.conf

# タイムゾーン設定
RUN echo "date.timezone = Asia/Tokyo" > /usr/local/etc/php/conf.d/timezone.ini

# PHP 設定のカスタマイズ（開発環境）
RUN echo "upload_max_filesize = 10M" > /usr/local/etc/php/conf.d/uploads.ini \
    && echo "post_max_size = 12M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "memory_limit = 256M" >> /usr/local/etc/php/conf.d/uploads.ini \
    && echo "max_execution_time = 60" >> /usr/local/etc/php/conf.d/uploads.ini

# OPcache 設定（本番環境用の最適化）
RUN echo "opcache.enable=1" > /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.memory_consumption=128" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.interned_strings_buffer=8" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.max_accelerated_files=10000" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.revalidate_freq=2" >> /usr/local/etc/php/conf.d/opcache.ini \
    && echo "opcache.fast_shutdown=1" >> /usr/local/etc/php/conf.d/opcache.ini

# 作業ディレクトリの設定
WORKDIR /var/www/html

# アプリケーションファイルのコピー
COPY . /var/www/html/

# uploads ディレクトリの作成と権限設定
RUN mkdir -p /var/www/html/uploads \
    && chown -R www-data:www-data /var/www/html/uploads \
    && chmod -R 755 /var/www/html/uploads

# api ディレクトリの権限設定
RUN chown -R www-data:www-data /var/www/html/api \
    && chmod -R 755 /var/www/html/api

# .htaccess ファイルのコピー（api/htaccess → api/.htaccess）
RUN if [ -f /var/www/html/api/htaccess ]; then \
        cp /var/www/html/api/htaccess /var/www/html/api/.htaccess; \
    fi

# uploads/.htaccess のコピー
RUN if [ -f /var/www/html/uploads/htaccess ]; then \
        cp /var/www/html/uploads/htaccess /var/www/html/uploads/.htaccess; \
    fi

# Apache の DocumentRoot を設定
RUN sed -i 's|/var/www/html|/var/www/html|g' /etc/apache2/sites-available/000-default.conf

# ヘルスチェック用エンドポイント
RUN echo "<?php http_response_code(200); echo json_encode(['status' => 'healthy', 'timestamp' => time()]); ?>" \
    > /var/www/html/health.php

# Configure Apache for Cloud Run (dynamic port binding)
# We create a startup script that updates the config at runtime
RUN echo '#!/bin/bash' > /usr/local/bin/start-apache.sh && \
    echo 'set -e' >> /usr/local/bin/start-apache.sh && \
    echo 'sed -i "s/Listen 80/Listen ${PORT}/g" /etc/apache2/ports.conf' >> /usr/local/bin/start-apache.sh && \
    echo 'sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/g" /etc/apache2/sites-available/000-default.conf' >> /usr/local/bin/start-apache.sh && \
    echo 'exec apache2-foreground' >> /usr/local/bin/start-apache.sh

# ポート 8080 を公開 (Cloud Run default)
EXPOSE 8080

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT}/health.php || exit 1

RUN chmod +x /usr/local/bin/start-apache.sh

# Apache を起動 (with port substitution)
CMD ["/usr/local/bin/start-apache.sh"]
