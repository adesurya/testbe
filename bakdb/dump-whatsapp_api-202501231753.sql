-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: whatsapp_api
-- ------------------------------------------------------
-- Server version	8.0.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `bulk_messages`
--

DROP TABLE IF EXISTS `bulk_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bulk_messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `bulk_id` int NOT NULL,
  `user_id` int NOT NULL,
  `whatsapp_session_id` int DEFAULT NULL,
  `target_number` varchar(20) NOT NULL,
  `message` text NOT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `status` enum('pending','sent','failed') DEFAULT 'pending',
  `error_message` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `bulk_id` (`bulk_id`),
  KEY `user_id` (`user_id`),
  KEY `whatsapp_session_id` (`whatsapp_session_id`),
  CONSTRAINT `bulk_messages_ibfk_1` FOREIGN KEY (`bulk_id`) REFERENCES `message_bulks` (`id`),
  CONSTRAINT `bulk_messages_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `bulk_messages_ibfk_3` FOREIGN KEY (`whatsapp_session_id`) REFERENCES `whatsapp_sessions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=28 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bulk_messages`
--

LOCK TABLES `bulk_messages` WRITE;
/*!40000 ALTER TABLE `bulk_messages` DISABLE KEYS */;
INSERT INTO `bulk_messages` VALUES (18,10,1,88,'628170261628','*Broadcast* :megaphone:\n_Hello!_',NULL,'sent',NULL,'2025-01-22 12:50:11','2025-01-22 12:50:42'),(19,10,1,88,'6285274352538','*Broadcast* :megaphone:\n_Hello!_',NULL,'sent',NULL,'2025-01-22 12:50:11','2025-01-22 12:51:17'),(20,11,1,88,'628170261628','*Broadcast* :phone:\n_Hello Alkarim Group Testing!_',NULL,'sent',NULL,'2025-01-22 12:57:45','2025-01-22 12:58:22'),(21,11,1,88,'6285274352538','*Broadcast* :phone:\n_Hello Alkarim Group Testing!_',NULL,'sent',NULL,'2025-01-22 12:57:45','2025-01-22 12:58:58'),(22,12,1,88,'628170261628','Special Promo! :fire:\nClick the button below to learn more',NULL,'sent',NULL,'2025-01-22 12:58:09','2025-01-22 12:58:46'),(23,12,1,88,'6285274352538','Special Promo! :fire:\nClick the button below to learn more',NULL,'sent',NULL,'2025-01-22 12:58:09','2025-01-22 12:59:21'),(24,13,1,88,'628170261628','*Test Lagi!* :phone:\n_Hello Alkarim Group Testing!_',NULL,'sent',NULL,'2025-01-22 13:00:49','2025-01-22 13:01:23'),(25,13,1,88,'6285274352538','*Test Lagi!* :phone:\n_Hello Alkarim Group Testing!_',NULL,'sent',NULL,'2025-01-22 13:00:49','2025-01-22 13:01:54'),(26,14,1,88,'6281905056155','*Test Lagi!* :phone:\n_Hello Group Testing!_',NULL,'sent',NULL,'2025-01-22 13:05:19','2025-01-22 13:05:58'),(27,14,1,88,'628170261628','*Test Lagi!* :phone:\n_Hello Group Testing!_',NULL,'sent',NULL,'2025-01-22 13:05:19','2025-01-22 13:06:32');
/*!40000 ALTER TABLE `bulk_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_bulks`
--

DROP TABLE IF EXISTS `message_bulks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_bulks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `message` text NOT NULL,
  `message_type` enum('regular','button') DEFAULT 'regular',
  `button_data` json DEFAULT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `total_messages` int NOT NULL,
  `total_sent` int DEFAULT '0',
  `total_failed` int DEFAULT '0',
  `status` enum('processing','completed','partially_completed','failed') DEFAULT 'processing',
  `failed_numbers` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed_at` timestamp NULL DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `message_bulks_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_bulks`
--

LOCK TABLES `message_bulks` WRITE;
/*!40000 ALTER TABLE `message_bulks` DISABLE KEYS */;
INSERT INTO `message_bulks` VALUES (10,1,'**Broadcast** :megaphone:\n__Hello!__','regular',NULL,NULL,2,2,0,'completed','[]','2025-01-22 12:50:11','2025-01-22 12:51:17','2025-01-22 12:51:18'),(11,1,'**Broadcast** :phone:\n__Hello Alkarim Group Testing!__','regular',NULL,NULL,2,2,0,'completed','[]','2025-01-22 12:57:45','2025-01-22 12:58:58','2025-01-22 12:58:59'),(12,1,'Special Promo! :fire:\nClick the button below to learn more','button','{\"url\": \"https://example.com/promo\", \"buttonText\": \"View Offer\", \"footerText\": \"Limited time offer\"}',NULL,2,2,0,'completed','[]','2025-01-22 12:58:09','2025-01-22 12:59:21','2025-01-22 12:59:21'),(13,1,'**Test Lagi!** :phone:\n__Hello Alkarim Group Testing!__','regular',NULL,NULL,2,2,0,'completed','[]','2025-01-22 13:00:49','2025-01-22 13:01:54','2025-01-22 13:01:54'),(14,1,'**Test Lagi!** :phone:\n__Hello Group Testing!__','regular',NULL,NULL,2,2,0,'completed','[]','2025-01-22 13:05:19','2025-01-22 13:06:32','2025-01-22 13:06:32');
/*!40000 ALTER TABLE `message_bulks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `message_usage_log`
--

DROP TABLE IF EXISTS `message_usage_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `message_usage_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `message_type` enum('sent','failed') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `message_usage_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `message_usage_log_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `message_usage_log`
--

LOCK TABLES `message_usage_log` WRITE;
/*!40000 ALTER TABLE `message_usage_log` DISABLE KEYS */;
/*!40000 ALTER TABLE `message_usage_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `messages`
--

DROP TABLE IF EXISTS `messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `messages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `whatsapp_session_id` int NOT NULL,
  `target_number` varchar(20) NOT NULL,
  `message` text NOT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `status` enum('pending','sent','failed') DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `whatsapp_session_id` (`whatsapp_session_id`),
  CONSTRAINT `messages_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `messages_ibfk_2` FOREIGN KEY (`whatsapp_session_id`) REFERENCES `whatsapp_sessions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `messages`
--

LOCK TABLES `messages` WRITE;
/*!40000 ALTER TABLE `messages` DISABLE KEYS */;
INSERT INTO `messages` VALUES (1,1,88,'628170261628','**PENGUMUMAN** :warning:\n__Kepada Pelanggan__\n\nInfo penting','/path/to/image.jpg','sent','2025-01-22 12:56:45','2025-01-22 12:56:45'),(2,1,88,'628170261628','*Broadcast* :phone:\n_Hello Alkarim Group Testing!_',NULL,'sent','2025-01-22 12:58:22','2025-01-22 12:58:22'),(3,1,88,'6285274352538','*Broadcast* :phone:\n_Hello Alkarim Group Testing!_',NULL,'sent','2025-01-22 12:58:58','2025-01-22 12:58:58'),(4,1,88,'628170261628','*Test Lagi!* :phone:\n_Hello Alkarim Group Testing!_',NULL,'sent','2025-01-22 13:01:23','2025-01-22 13:01:23'),(5,1,88,'6285274352538','*Test Lagi!* :phone:\n_Hello Alkarim Group Testing!_',NULL,'sent','2025-01-22 13:01:53','2025-01-22 13:01:54'),(6,1,88,'6281905056155','*Test Lagi!* :phone:\n_Hello Group Testing!_',NULL,'sent','2025-01-22 13:05:58','2025-01-22 13:05:58'),(7,1,88,'628170261628','*Test Lagi!* :phone:\n_Hello Group Testing!_',NULL,'sent','2025-01-22 13:06:32','2025-01-22 13:06:32');
/*!40000 ALTER TABLE `messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `metrics`
--

DROP TABLE IF EXISTS `metrics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `metrics` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `whatsapp_session_id` int NOT NULL,
  `message_count` int DEFAULT '0',
  `success_count` int DEFAULT '0',
  `failed_count` int DEFAULT '0',
  `last_activity` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_session` (`user_id`,`whatsapp_session_id`),
  KEY `whatsapp_session_id` (`whatsapp_session_id`),
  CONSTRAINT `metrics_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `metrics_ibfk_2` FOREIGN KEY (`whatsapp_session_id`) REFERENCES `whatsapp_sessions` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=85 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `metrics`
--

LOCK TABLES `metrics` WRITE;
/*!40000 ALTER TABLE `metrics` DISABLE KEYS */;
INSERT INTO `metrics` VALUES (71,1,87,2,2,0,'2025-01-22 07:01:52','2025-01-22 07:01:52','2025-01-22 07:04:39'),(73,1,88,12,12,0,'2025-01-22 12:49:14','2025-01-22 12:49:14','2025-01-22 13:06:32');
/*!40000 ALTER TABLE `metrics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payments`
--

DROP TABLE IF EXISTS `payments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `merchant_order_id` varchar(255) NOT NULL,
  `reference` varchar(255) DEFAULT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `payment_url` text,
  `status` enum('pending','paid','expired','failed') DEFAULT 'pending',
  `expiry_time` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `merchant_order_id` (`merchant_order_id`),
  KEY `user_id` (`user_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `payments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `payments_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (1,4,1,'1737100445831','D717825Q15VSIAHITAZDPS',149.99,'OV','https://sandbox.duitku.com/topup/topupdirectv2.aspx?ref=OV25ZQ7Y5EV1TLHWB4V','pending','2025-01-17 08:54:07','2025-01-17 07:54:06','2025-01-17 07:54:06'),(2,4,3,'1737100689401','D717825FTYAI453W6KN3YF',300000.00,'BC','https://sandbox.duitku.com/topup/topupdirectv2.aspx?ref=BC25KFTNMATM4GJLD0X','pending','2025-01-17 08:58:10','2025-01-17 07:58:10','2025-01-17 07:58:10'),(3,5,3,'1737106874232','D717825V15D6XRZYOB0WG0',300000.00,'BC','https://sandbox.duitku.com/topup/topupdirectv2.aspx?ref=BC25Q2LV32A47VNCNFA','pending','2025-01-17 10:41:15','2025-01-17 09:41:14','2025-01-17 09:41:14'),(4,1,3,'1737107616859','D7178257Y2HJFBLGZJO8FJ',300000.00,'BC','https://sandbox.duitku.com/topup/topupdirectv2.aspx?ref=BC25WZQVG7UOL1OSM7J','pending','2025-01-17 10:53:38','2025-01-17 09:53:37','2025-01-17 09:53:37'),(5,8,3,'1737108891177','D717825B8EPTWBIPHIZSKF',300000.00,'BC','https://sandbox.duitku.com/topup/topupdirectv2.aspx?ref=BC25SESB1Q8B01X6QTT','paid','2025-01-17 11:14:52','2025-01-17 10:14:51','2025-01-17 10:15:58');
/*!40000 ALTER TABLE `payments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plan_transactions`
--

DROP TABLE IF EXISTS `plan_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plan_transactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `transaction_type` enum('purchase','topup') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('offline','online') DEFAULT 'offline',
  `payment_status` enum('pending','completed','failed') DEFAULT 'pending',
  `messages_added` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `plan_transactions_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `plan_transactions_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan_transactions`
--

LOCK TABLES `plan_transactions` WRITE;
/*!40000 ALTER TABLE `plan_transactions` DISABLE KEYS */;
INSERT INTO `plan_transactions` VALUES (5,1,1,'purchase',149.99,'offline','completed',1500,'2025-01-16 13:21:11','2025-01-16 13:21:11'),(6,1,1,'topup',0.00,'offline','pending',500,'2025-01-16 13:21:31','2025-01-16 13:21:31'),(7,1,1,'topup',0.00,'offline','pending',500,'2025-01-16 13:21:45','2025-01-16 13:21:45'),(8,1,1,'topup',0.00,'offline','pending',500,'2025-01-16 13:21:48','2025-01-16 13:21:48'),(9,1,1,'topup',0.00,'offline','pending',500,'2025-01-16 13:21:56','2025-01-16 13:21:56'),(10,1,1,'purchase',149.99,'offline','completed',1500,'2025-01-16 13:28:41','2025-01-16 13:28:41'),(12,1,1,'topup',0.00,'offline','completed',700,'2025-01-16 13:30:54','2025-01-16 13:30:54'),(13,8,3,'purchase',300000.00,'offline','completed',1000,'2025-01-17 10:15:58','2025-01-17 10:15:58'),(14,1,1,'purchase',100000.00,'offline','completed',1500,'2025-01-17 16:23:11','2025-01-17 16:23:11'),(15,1,1,'purchase',100000.00,'offline','completed',1500,'2025-01-20 08:33:34','2025-01-20 08:33:34');
/*!40000 ALTER TABLE `plan_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plans`
--

DROP TABLE IF EXISTS `plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `message_limit` int NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `duration_days` int NOT NULL,
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES (1,'Basic Awal',1500,100000.00,45,'active','2025-01-16 12:53:12','2025-01-17 10:35:03'),(2,'Basic Akhir',1500,200000.00,45,'active','2025-01-17 07:50:04','2025-01-17 10:35:11'),(3,'Platinum',1000,300000.00,30,'active','2025-01-17 07:57:09','2025-01-17 07:57:09'),(4,'Test Buat',1000,400000.00,30,'inactive','2025-01-17 10:35:23','2025-01-17 10:37:33');
/*!40000 ALTER TABLE `plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_plans`
--

DROP TABLE IF EXISTS `user_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_plans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `plan_id` int NOT NULL,
  `messages_remaining` int NOT NULL,
  `start_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `end_date` timestamp NOT NULL,
  `status` enum('active','expired','cancelled') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `plan_id` (`plan_id`),
  CONSTRAINT `user_plans_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `user_plans_ibfk_2` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_plans`
--

LOCK TABLES `user_plans` WRITE;
/*!40000 ALTER TABLE `user_plans` DISABLE KEYS */;
INSERT INTO `user_plans` VALUES (11,1,1,1472,'2025-01-20 08:33:34','2025-03-06 08:33:34','active','2025-01-20 08:33:34','2025-01-22 13:06:32');
/*!40000 ALTER TABLE `user_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `role` enum('admin','user') DEFAULT 'user',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `google_id` varchar(255) DEFAULT NULL,
  `profile_picture` text,
  `oauth_provider` enum('local','google') DEFAULT 'local',
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2a$10$9bCRGEyUMdJxNR1DFRvgrukdrxpg62fQJPReRNOcuOkdGG.mnmdZ2','admin@example.com','admin','active','2025-01-16 09:29:58','2025-01-16 09:29:58',NULL,NULL,'local'),(4,'doni','$2a$10$bgIkrNINs/fxNPbOOfDLy.c6OKEXZCPXGh64oFxqrzN0CkBvwVhjW','doni@gmail.com','user','active','2025-01-16 12:57:08','2025-01-16 12:57:08',NULL,NULL,'local'),(5,'inti','$2a$10$N41uEIFMn3uzV9VGMEa7EewccfK4a7KNi7UUfYiMS/T4f98iGhcmO','inti@gmail.com','user','active','2025-01-17 09:39:31','2025-01-17 09:39:31',NULL,NULL,'local'),(7,'hamid','$2a$10$m6OFL3ffYzVKc.HRj9M0wup0Mcev0llZHiYl7EWaWYRqIjcRgWkES','hamid@gmail.com','user','active','2025-01-17 09:52:47','2025-01-17 09:52:47',NULL,NULL,'local'),(8,'bagus','$2a$10$S5g8.k/lDY530klcrWF7GupLlNNixvkSAMhkwm4q8swvFEVTObB8C','bagus@gmail.com','user','active','2025-01-17 10:13:33','2025-01-17 10:13:33',NULL,NULL,'local');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_sessions`
--

DROP TABLE IF EXISTS `whatsapp_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_sessions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` varchar(255) NOT NULL,
  `phone_number` varchar(20) NOT NULL,
  `status` enum('active','inactive') DEFAULT 'inactive',
  `last_used` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_shared` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_phone` (`phone_number`)
) ENGINE=InnoDB AUTO_INCREMENT=89 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_sessions`
--

LOCK TABLES `whatsapp_sessions` WRITE;
/*!40000 ALTER TABLE `whatsapp_sessions` DISABLE KEYS */;
INSERT INTO `whatsapp_sessions` VALUES (87,'1','128123456789','inactive','2025-01-22 06:59:03','2025-01-22 06:59:03','2025-01-23 04:29:57',0),(88,'1','628123456789','inactive','2025-01-22 12:47:22','2025-01-22 12:47:22','2025-01-23 04:49:01',0);
/*!40000 ALTER TABLE `whatsapp_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'whatsapp_api'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-01-23 17:53:02
