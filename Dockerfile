FROM php:8.2-apache

# Enable Apache mod_rewrite
RUN a2enmod rewrite

# Install PDO MySQL extension
RUN docker-php-ext-install pdo pdo_mysql

# Install GD for image handling (profile pictures)
RUN apt-get update && apt-get install -y libpng-dev libjpeg-dev && \
    docker-php-ext-configure gd && \
    docker-php-ext-install gd

# Copy your app into Apache's web root
COPY . /var/www/html/

# Make uploads folder writable
RUN mkdir -p /var/www/html/Frontend/uploads/avatars && \
    chown -R www-data:www-data /var/www/html/Frontend/uploads

EXPOSE 80
