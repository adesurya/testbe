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
  `merchant_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Merchant code from payment gateway',
  `merchant_order_id` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Unique order ID for payment gateway',
  `reference` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Payment reference from payment gateway',
  `amount` decimal(10,2) NOT NULL COMMENT 'Transaction amount',
  `payment_method` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL COMMENT 'Payment method code (BC, M2, VA, etc)',
  `payment_url` text COLLATE utf8mb4_unicode_ci COMMENT 'Payment gateway redirect URL',
  `va_number` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Virtual Account number for VA payments',
  `qr_string` text COLLATE utf8mb4_unicode_ci COMMENT 'QR string for QRIS payments',
  `status` enum('pending','paid','expired','failed','refunded') COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `status_code` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Status code from payment gateway',
  `status_message` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL COMMENT 'Status message from payment gateway',
  `payment_details` json DEFAULT NULL COMMENT 'Additional payment response details',
  `expiry_time` timestamp NULL DEFAULT NULL COMMENT 'Payment expiration time',
  `paid_time` timestamp NULL DEFAULT NULL COMMENT 'Time when payment was successfully completed',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_merchant_order` (`merchant_order_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_plan_id` (`plan_id`),
  KEY `idx_reference` (`reference`),
  KEY `idx_va_number` (`va_number`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_expiry_time` (`expiry_time`),
  CONSTRAINT `payments_plan_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `payments_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Payment transactions table';
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payments`
--

LOCK TABLES `payments` WRITE;
/*!40000 ALTER TABLE `payments` DISABLE KEYS */;
INSERT INTO `payments` VALUES (4,1,2,'D7178','ORDER250131175706KDF8O',NULL,200000.00,'BC',NULL,NULL,NULL,'pending',NULL,NULL,NULL,'2025-01-31 11:07:08',NULL,'2025-01-31 10:57:08','2025-01-31 10:57:08');
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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan_transactions`
--

LOCK TABLES `plan_transactions` WRITE;
/*!40000 ALTER TABLE `plan_transactions` DISABLE KEYS */;
INSERT INTO `plan_transactions` VALUES (16,10,1,'purchase',100000.00,'offline','completed',1500,'2025-01-30 07:01:33','2025-01-30 07:01:33');
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
  `description` text,
  `features` json DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plans`
--

LOCK TABLES `plans` WRITE;
/*!40000 ALTER TABLE `plans` DISABLE KEYS */;
INSERT INTO `plans` VALUES (1,'Basic Awal',1500,100000.00,45,'active','2025-01-16 12:53:12','2025-01-17 10:35:03',NULL,NULL),(2,'Basic Akhir',1500,200000.00,45,'active','2025-01-17 07:50:04','2025-01-17 10:35:11',NULL,NULL),(3,'Platinum',1000,300000.00,30,'active','2025-01-17 07:57:09','2025-01-17 07:57:09',NULL,NULL),(4,'Test Buat',1000,400000.00,30,'inactive','2025-01-17 10:35:23','2025-01-17 10:37:33',NULL,NULL);
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
) ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_plans`
--

LOCK TABLES `user_plans` WRITE;
/*!40000 ALTER TABLE `user_plans` DISABLE KEYS */;
INSERT INTO `user_plans` VALUES (11,1,1,1472,'2025-01-20 08:33:34','2025-03-06 08:33:34','active','2025-01-20 08:33:34','2025-01-22 13:06:32'),(12,10,1,1500,'2025-01-30 07:01:33','2025-03-16 07:01:33','active','2025-01-30 07:01:33','2025-01-30 07:01:33');
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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'admin','$2a$10$9bCRGEyUMdJxNR1DFRvgrukdrxpg62fQJPReRNOcuOkdGG.mnmdZ2','admin@example.com','admin','active','2025-01-16 09:29:58','2025-01-16 09:29:58',NULL,NULL,'local'),(4,'doni','$2a$10$bgIkrNINs/fxNPbOOfDLy.c6OKEXZCPXGh64oFxqrzN0CkBvwVhjW','doni@gmail.com','user','active','2025-01-16 12:57:08','2025-01-16 12:57:08',NULL,NULL,'local'),(5,'inti','$2a$10$N41uEIFMn3uzV9VGMEa7EewccfK4a7KNi7UUfYiMS/T4f98iGhcmO','inti@gmail.com','user','active','2025-01-17 09:39:31','2025-01-17 09:39:31',NULL,NULL,'local'),(7,'hamid','$2a$10$m6OFL3ffYzVKc.HRj9M0wup0Mcev0llZHiYl7EWaWYRqIjcRgWkES','hamid@gmail.com','user','active','2025-01-17 09:52:47','2025-01-17 09:52:47',NULL,NULL,'local'),(8,'bagus','$2a$10$S5g8.k/lDY530klcrWF7GupLlNNixvkSAMhkwm4q8swvFEVTObB8C','bagus@gmail.com','user','active','2025-01-17 10:13:33','2025-01-17 10:13:33',NULL,NULL,'local'),(9,'demoregegister','$2a$10$5FVyzwJN7NnsWhllZenZQOTVgycEdrIiMAxsFoSVZxBG.B1vKVlpm','demoregister@example.com','user','active','2025-01-26 15:08:55','2025-01-26 15:08:55',NULL,NULL,'local'),(10,'malik','$2a$10$gTMMSPwdDeofTfnlDo2dtei3D1GJhLwDASCEZFhG1V5VS/PPeIy2y','malik@example.com','user','active','2025-01-29 12:29:24','2025-01-29 12:29:24',NULL,NULL,'local');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `v_payment_summary`
--

DROP TABLE IF EXISTS `v_payment_summary`;
/*!50001 DROP VIEW IF EXISTS `v_payment_summary`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `v_payment_summary` AS SELECT 
 1 AS `id`,
 1 AS `merchant_order_id`,
 1 AS `username`,
 1 AS `plan_name`,
 1 AS `amount`,
 1 AS `payment_method`,
 1 AS `status`,
 1 AS `created_at`,
 1 AS `paid_time`,
 1 AS `processing_time_minutes`*/;
SET character_set_client = @saved_cs_client;

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
/*!40000 ALTER TABLE `whatsapp_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'whatsapp_api'
--

--
-- Final view structure for view `v_payment_summary`
--

/*!50001 DROP VIEW IF EXISTS `v_payment_summary`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`localhost` SQL SECURITY DEFINER */
/*!50001 VIEW `v_payment_summary` AS select `p`.`id` AS `id`,`p`.`merchant_order_id` AS `merchant_order_id`,`u`.`username` AS `username`,`pl`.`name` AS `plan_name`,`p`.`amount` AS `amount`,`p`.`payment_method` AS `payment_method`,`p`.`status` AS `status`,`p`.`created_at` AS `created_at`,`p`.`paid_time` AS `paid_time`,timestampdiff(MINUTE,`p`.`created_at`,(case when (`p`.`status` = 'paid') then `p`.`paid_time` when ((`p`.`status` = 'pending') and (`p`.`expiry_time` > now())) then now() else `p`.`expiry_time` end)) AS `processing_time_minutes` from ((`payments` `p` join `users` `u` on((`p`.`user_id` = `u`.`id`))) join `plans` `pl` on((`p`.`plan_id` = `pl`.`id`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-01-31 18:30:01
