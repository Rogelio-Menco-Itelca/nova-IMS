-- MySQL dump 10.13  Distrib 8.0.45, for Win64 (x86_64)
--
-- Host: localhost    Database: gestionincidentes
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `agencias`
--

DROP TABLE IF EXISTS `agencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `agencias` (
  `IDAgencias` varchar(5) NOT NULL,
  `Nombre_Agencia` varchar(100) NOT NULL,
  `Descripcion` varchar(255) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`IDAgencias`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `agencias`
--

LOCK TABLES `agencias` WRITE;
/*!40000 ALTER TABLE `agencias` DISABLE KEYS */;
INSERT INTO `agencias` VALUES ('CRU','CRUE','Centro Regulador de Urgencias y Emergencias en Salud - CRUE','2026-05-29 10:06:42'),('CSJ','Consejo Superior De La Judicatura','Órgano colombiano de administración y gobierno de la Rama Judicial de Colombia','2026-06-03 12:10:03'),('POL','Policia','Policia Nacional de colombia','2026-05-29 10:06:42');
/*!40000 ALTER TABLE `agencias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auditoria_general`
--

DROP TABLE IF EXISTS `auditoria_general`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditoria_general` (
  `ID_Auditoria` varchar(300) NOT NULL,
  `Tabla_Afectada` varchar(50) NOT NULL,
  `Accion` varchar(100) NOT NULL,
  `Detalle` text,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaCambio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Auditoria`),
  KEY `fk_auditoria_general_usuario` (`ID_Usuario`,`ID_Agencia`),
  CONSTRAINT `fk_auditoria_general_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria_general`
--

LOCK TABLES `auditoria_general` WRITE;
/*!40000 ALTER TABLE `auditoria_general` DISABLE KEYS */;
INSERT INTO `auditoria_general` VALUES ('LOG-1780796774540-960','admin','Eliminación de Operador','Se eliminó el operador CJIMENEZe','rbenavides','CSJ','2026-06-06 20:46:14'),('LOG-1780796778046-749','admin','Eliminación de Operador','Se eliminó el operador CJIMENEZ','rbenavides','CSJ','2026-06-06 20:46:18'),('LOG-1780796782100-663','admin','Eliminación de Operador','Se eliminó el operador JBETANCOURT','rbenavides','CSJ','2026-06-06 20:46:22'),('LOG-1780797727961-576','admin','Creación de Operador','Se creó el operador miguel chaparro (MCHAPARRO)','rbenavides','CSJ','2026-06-06 21:02:07'),('LOG-1780798044461-502','admin','Eliminación de Operador','Se eliminó el operador MCHAPARRO','rbenavides','CSJ','2026-06-06 21:07:24'),('LOG-1780798094865-132','admin','Creación de Operador','Se creó el operador miguel chaparro (MCHAPARRO)','rbenavides','CSJ','2026-06-06 21:08:14'),('LOG-1780798437436-259','admin','Eliminación de Operador','Se eliminó el operador MCHAPARRO','rbenavides','CSJ','2026-06-06 21:13:57'),('LOG-1780798668503-62','admin','Creación de Operador','Se creó el operador miguel chaparro (MCHAPARRO)','rbenavides','CSJ','2026-06-06 21:17:48'),('LOG-1780798921581-935','admin','Actualización de Operador','Se actualizó el operador MCHAPARRO','rbenavides','CSJ','2026-06-06 21:22:01'),('LOG-1780798975682-765','admin','Actualización de Operador','Se actualizó el operador MCHAPARRO','rbenavides','CSJ','2026-06-06 21:22:55'),('LOG-1780800090587-563','admin','Creación de Persona','Se registró a ana rodriguez (PER-001)','rbenavides','CSJ','2026-06-06 21:41:30'),('LOG-1780800575831-942','admin','Creación de Persona','Se registró a ana rodriguez (PER-2)','rbenavides','CSJ','2026-06-06 21:49:35'),('LOG-1780800746997-312','admin','Actualización de Operador','Se actualizó el operador MCHAPARRO','rbenavides','CSJ','2026-06-06 21:52:27'),('LOG-1780800857775-54','admin','Creación de Persona','Se registró a rogelio perez (PER-4)','rbenavides','CSJ','2026-06-06 21:54:17'),('LOG-1780800931762-523','admin','Eliminación de Persona','Se eliminó la persona ID: PER-4','rbenavides','CSJ','2026-06-06 21:55:31'),('LOG-1780801065451-156','admin','Eliminación de Persona','Se eliminó la persona ID: PER-2','rbenavides','CSJ','2026-06-06 21:57:45'),('LOG-1780801092346-300','admin','Creación de Persona','Se registró a Ana Rodriguez (PER-5)','rbenavides','CSJ','2026-06-06 21:58:12');
/*!40000 ALTER TABLE `auditoria_general` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auditoria_incidente`
--

DROP TABLE IF EXISTS `auditoria_incidente`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditoria_incidente` (
  `id_transaccion_incidentes` varchar(200) NOT NULL,
  `incidentes_id` int NOT NULL,
  `usuarios_id` varchar(20) DEFAULT NULL,
  `Id_agencia` varchar(5) NOT NULL,
  `accion` varchar(120) NOT NULL,
  `Numero_de_Cambios` varchar(500) DEFAULT NULL,
  `detalles` json DEFAULT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_transaccion_incidentes`),
  KEY `idx_incidentes_id` (`incidentes_id`),
  KEY `idx_usuarios_id` (`usuarios_id`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_agencia` (`Id_agencia`),
  KEY `fk_auditoria_incidente_usuario` (`usuarios_id`,`Id_agencia`),
  CONSTRAINT `auditoria_incidente_ibfk_1` FOREIGN KEY (`incidentes_id`) REFERENCES `incidentes` (`ID_incidente`),
  CONSTRAINT `fk_auditoria_incidente_usuario` FOREIGN KEY (`usuarios_id`, `Id_agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria_incidente`
--

LOCK TABLES `auditoria_incidente` WRITE;
/*!40000 ALTER TABLE `auditoria_incidente` DISABLE KEYS */;
/*!40000 ALTER TABLE `auditoria_incidente` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comentarios_incidentes`
--

DROP TABLE IF EXISTS `comentarios_incidentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comentarios_incidentes` (
  `ID_Comentario` int NOT NULL AUTO_INCREMENT,
  `ID_Incidente` int NOT NULL,
  `Comentario` text NOT NULL,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaHora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Comentario`),
  KEY `fk_comentario_incidente` (`ID_Incidente`),
  KEY `fk_comentario_usuario` (`ID_Usuario`,`ID_Agencia`),
  CONSTRAINT `fk_comentario_incidente` FOREIGN KEY (`ID_Incidente`) REFERENCES `incidentes` (`ID_incidente`),
  CONSTRAINT `fk_comentario_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comentarios_incidentes`
--

LOCK TABLES `comentarios_incidentes` WRITE;
/*!40000 ALTER TABLE `comentarios_incidentes` DISABLE KEYS */;
/*!40000 ALTER TABLE `comentarios_incidentes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comentarios_lugar`
--

DROP TABLE IF EXISTS `comentarios_lugar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comentarios_lugar` (
  `ID_comentario_lugar` int NOT NULL AUTO_INCREMENT,
  `ID_lugar` int NOT NULL,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaHora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Comentario_lugar` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`ID_comentario_lugar`),
  KEY `fk_comentario_lugar_usuario` (`ID_Usuario`,`ID_Agencia`),
  KEY `idx_lugar` (`ID_lugar`),
  KEY `idx_usuario` (`ID_Usuario`),
  KEY `idx_agencia` (`ID_Agencia`),
  KEY `idx_fecha` (`FechaHora`),
  CONSTRAINT `fk_comentario_lugar_lugar` FOREIGN KEY (`ID_lugar`) REFERENCES `lugares` (`ID_lugar`),
  CONSTRAINT `fk_comentario_lugar_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comentarios_lugar`
--

LOCK TABLES `comentarios_lugar` WRITE;
/*!40000 ALTER TABLE `comentarios_lugar` DISABLE KEYS */;
/*!40000 ALTER TABLE `comentarios_lugar` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comentariospersonas`
--

DROP TABLE IF EXISTS `comentariospersonas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comentariospersonas` (
  `ID_transaccion_persona` int NOT NULL AUTO_INCREMENT,
  `ID_persona` int NOT NULL,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaHora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Comentarios` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`ID_transaccion_persona`),
  KEY `FK_ComentariosPersonas_Personas` (`ID_persona`),
  KEY `FK_ComentariosPersonas_Usuarios` (`ID_Usuario`),
  KEY `fk_comentariospersonas_usuario` (`ID_Usuario`,`ID_Agencia`),
  CONSTRAINT `FK_ComentariosPersonas_Personas` FOREIGN KEY (`ID_persona`) REFERENCES `personas` (`ID_persona`),
  CONSTRAINT `fk_comentariospersonas_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comentariospersonas`
--

LOCK TABLES `comentariospersonas` WRITE;
/*!40000 ALTER TABLE `comentariospersonas` DISABLE KEYS */;
/*!40000 ALTER TABLE `comentariospersonas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comentariosvehiculos`
--

DROP TABLE IF EXISTS `comentariosvehiculos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comentariosvehiculos` (
  `ID_transaccion_vehiculo` int NOT NULL AUTO_INCREMENT,
  `ID_vehiculo` int NOT NULL,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaHora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Comentarios` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`ID_transaccion_vehiculo`),
  KEY `FK_ComentariosVehiculos_Vehiculos` (`ID_vehiculo`),
  KEY `FK_ComentariosVehiculos_Usuarios` (`ID_Usuario`),
  KEY `fk_comentariosvehiculos_usuario` (`ID_Usuario`,`ID_Agencia`),
  CONSTRAINT `fk_comentariosvehiculos_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `FK_ComentariosVehiculos_Vehiculos` FOREIGN KEY (`ID_vehiculo`) REFERENCES `vehiculos` (`ID_vehiculo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comentariosvehiculos`
--

LOCK TABLES `comentariosvehiculos` WRITE;
/*!40000 ALTER TABLE `comentariosvehiculos` DISABLE KEYS */;
/*!40000 ALTER TABLE `comentariosvehiculos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comunicacion`
--

DROP TABLE IF EXISTS `comunicacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comunicacion` (
  `ID_comunicacion` int NOT NULL AUTO_INCREMENT,
  `ID_incidente` int NOT NULL,
  `ID_usuario` varchar(50) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `Fecha_envio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Destinatario` varchar(150) NOT NULL,
  PRIMARY KEY (`ID_comunicacion`),
  KEY `FK_Comunicacion_Usuarios` (`ID_usuario`),
  KEY `FK_Comunicacion_Destinatario` (`Destinatario`),
  KEY `FK_Comunicacion_Incidentes` (`ID_incidente`),
  KEY `fk_comunicacion_usuario` (`ID_usuario`,`ID_Agencia`),
  CONSTRAINT `FK_Comunicacion_Destinatario` FOREIGN KEY (`Destinatario`) REFERENCES `correosincidentes` (`Correo`),
  CONSTRAINT `FK_Comunicacion_Incidentes` FOREIGN KEY (`ID_incidente`) REFERENCES `incidentes` (`ID_incidente`),
  CONSTRAINT `fk_comunicacion_usuario` FOREIGN KEY (`ID_usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comunicacion`
--

LOCK TABLES `comunicacion` WRITE;
/*!40000 ALTER TABLE `comunicacion` DISABLE KEYS */;
/*!40000 ALTER TABLE `comunicacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contador_incidente_visible`
--

DROP TABLE IF EXISTS `contador_incidente_visible`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contador_incidente_visible` (
  `Anio` int NOT NULL,
  `Ultimo_Numero` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`Anio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contador_incidente_visible`
--

LOCK TABLES `contador_incidente_visible` WRITE;
/*!40000 ALTER TABLE `contador_incidente_visible` DISABLE KEYS */;
INSERT INTO `contador_incidente_visible` VALUES (2025,1),(2026,5);
/*!40000 ALTER TABLE `contador_incidente_visible` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `correosincidentes`
--

DROP TABLE IF EXISTS `correosincidentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `correosincidentes` (
  `Correo` varchar(150) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Correo`,`ID_Agencia`),
  KEY `FK_CorreosIncidentes_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_CorreosIncidentes_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `correosincidentes`
--

LOCK TABLES `correosincidentes` WRITE;
/*!40000 ALTER TABLE `correosincidentes` DISABLE KEYS */;
INSERT INTO `correosincidentes` VALUES ('alexandra.higuera@itelca.com.co','csj','2026-06-04 15:57:39'),('alexandra.higuera@itelca.com.co','pol','2026-06-04 15:57:50'),('dilan.novoa@itelca.com.co','csj','2026-06-04 15:57:39'),('dilan.novoa@itelca.com.co','pol','2026-06-04 15:57:50'),('juan.perez@example.com','csj','2026-06-04 15:53:30'),('juan.perez@example.com','POL','2026-06-04 15:53:45'),('rogelio.menco@itelca.com.co','csj','2026-06-04 15:57:39'),('rogelio.menco@itelca.com.co','pol','2026-06-04 15:57:50'),('rogeliomenco4@gmail.com','csj','2026-06-04 15:57:39'),('rogeliomenco4@gmail.com','pol','2026-06-04 15:57:50');
/*!40000 ALTER TABLE `correosincidentes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `departamentos`
--

DROP TABLE IF EXISTS `departamentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `departamentos` (
  `id_departamento` int NOT NULL AUTO_INCREMENT,
  `codigo_departamento` char(3) NOT NULL,
  `nombre_departamento` varchar(80) NOT NULL,
  `IDAgencias` varchar(5) NOT NULL,
  PRIMARY KEY (`id_departamento`),
  UNIQUE KEY `uk_departamentos_codigo_agencia` (`codigo_departamento`,`IDAgencias`),
  UNIQUE KEY `uk_departamentos_nombre_agencia` (`nombre_departamento`,`IDAgencias`),
  KEY `idx_departamentos_agencia` (`IDAgencias`),
  CONSTRAINT `departamentos_ibfk_1` FOREIGN KEY (`IDAgencias`) REFERENCES `agencias` (`IDAgencias`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `departamentos`
--

LOCK TABLES `departamentos` WRITE;
/*!40000 ALTER TABLE `departamentos` DISABLE KEYS */;
INSERT INTO `departamentos` VALUES (1,'05','ANTIOQUIA','CSJ'),(2,'08','ATLÁNTICO','CSJ'),(3,'11','BOGOTÁ, D.C.','CSJ'),(4,'13','BOLÍVAR','CSJ'),(5,'15','BOYACÁ','CSJ'),(6,'17','CALDAS','CSJ'),(7,'18','CAQUETÁ','CSJ'),(8,'19','CAUCA','CSJ'),(9,'20','CESAR','CSJ'),(10,'23','CÓRDOBA','CSJ'),(11,'25','CUNDINAMARCA','CSJ'),(12,'27','CHOCÓ','CSJ'),(13,'41','HUILA','CSJ'),(14,'44','LA GUAJIRA','CSJ'),(15,'47','MAGDALENA','CSJ'),(16,'50','META','CSJ'),(17,'52','NARIÑO','CSJ'),(18,'54','NORTE DE SANTANDER','CSJ'),(19,'63','QUINDÍO','CSJ'),(20,'66','RISARALDA','CSJ'),(21,'68','SANTANDER','CSJ'),(22,'70','SUCRE','CSJ'),(23,'73','TOLIMA','CSJ'),(24,'76','VALLE DEL CAUCA','CSJ'),(25,'81','ARAUCA','CSJ'),(26,'85','CASANARE','CSJ'),(27,'86','PUTUMAYO','CSJ'),(28,'88','ARCHIPIÉLAGO DE SAN ANDRÉS, PROVIDENCIA Y SANTA CATALINA','CSJ'),(29,'91','AMAZONAS','CSJ'),(30,'94','GUAINÍA','CSJ'),(31,'95','GUAVIARE','CSJ'),(32,'97','VAUPÉS','CSJ'),(33,'99','VICHADA','CSJ');
/*!40000 ALTER TABLE `departamentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `estadosincidentes`
--

DROP TABLE IF EXISTS `estadosincidentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `estadosincidentes` (
  `ID_estado` int NOT NULL AUTO_INCREMENT,
  `ID_Agencia` varchar(5) NOT NULL,
  `Nombre_estado` varchar(50) NOT NULL,
  `Descripcion` varchar(100) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_estado`),
  UNIQUE KEY `UQ_Estado_Agencia` (`Nombre_estado`,`ID_Agencia`),
  KEY `FK_EstadosIncidentes_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_EstadosIncidentes_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `estadosincidentes`
--

LOCK TABLES `estadosincidentes` WRITE;
/*!40000 ALTER TABLE `estadosincidentes` DISABLE KEYS */;
INSERT INTO `estadosincidentes` VALUES (1,'POL','Abierto','Incidente recién creado','2026-05-29 10:06:43'),(2,'POL','En espera','Incidente esperando asignación','2026-05-29 10:06:43'),(3,'POL','Asignado','Incidente asignado a una patrulla','2026-05-29 10:06:43'),(4,'POL','En proceso','Incidente en atención activa','2026-05-29 10:06:43'),(5,'POL','Cerrado','Incidente finalizado y resuelto','2026-05-29 10:06:43'),(6,'POL','Cancelado','Incidente cancelado sin resolver','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `estadosincidentes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eventos`
--

DROP TABLE IF EXISTS `eventos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos` (
  `ID_evento` int NOT NULL AUTO_INCREMENT,
  `ID_Agencia` varchar(5) NOT NULL,
  `Descripcion` varchar(100) NOT NULL,
  `TipoEvento` varchar(50) NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `prioridad_por_defecto` int NOT NULL,
  PRIMARY KEY (`ID_evento`),
  UNIQUE KEY `UQ_Evento_Agencia` (`TipoEvento`,`ID_Agencia`),
  KEY `FK_Eventos_Agencias` (`ID_Agencia`),
  KEY `fk_prioridad_por_defecto` (`prioridad_por_defecto`),
  CONSTRAINT `FK_Eventos_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`),
  CONSTRAINT `fk_prioridad_por_defecto` FOREIGN KEY (`prioridad_por_defecto`) REFERENCES `prioridades` (`ID_prioridad`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventos`
--

LOCK TABLES `eventos` WRITE;
/*!40000 ALTER TABLE `eventos` DISABLE KEYS */;
INSERT INTO `eventos` VALUES (1,'POL','Disparos','911','2026-05-29 10:06:43',1),(2,'POL','Accidente de tránsito','Accidente','2026-05-29 10:06:43',1),(3,'CSJ','Amenaza contra juez o magistrado','Amenaza','2026-06-07 11:50:38',1),(4,'CSJ','Seguimiento o vigilancia a funcionario judicial','Vigilancia','2026-06-07 11:50:38',1),(5,'CSJ','Atentado o agresión física a funcionario judicial','Agresión','2026-06-07 11:50:38',1),(6,'CSJ','Extorsión a funcionario judicial','Extorsión','2026-06-07 11:50:38',1),(7,'CSJ','Acceso no autorizado a despacho judicial','Acceso indebido','2026-06-07 11:50:38',1),(8,'CSJ','Artefacto explosivo o sospechoso en sede','Explosivo','2026-06-07 11:50:38',1),(9,'CSJ','Vandalismo en instalaciones judiciales','Vandalismo','2026-06-07 11:50:38',2),(10,'CSJ','Incendio o emergencia en sede judicial','Emergencia','2026-06-07 11:50:38',1),(11,'CSJ','Hurto o destrucción de expedientes judiciales','Hurto','2026-06-07 11:50:38',1),(12,'CSJ','Interceptación de comunicaciones judiciales','Interceptación','2026-06-07 11:50:38',1),(13,'CSJ','Suplantación de funcionario judicial','Fraude','2026-06-07 11:50:38',1),(14,'CSJ','Fuga de información reservada','Fuga de información','2026-06-07 11:50:38',1),(15,'CSJ','Disturbio en audiencia pública','Disturbio','2026-06-07 11:50:38',2),(16,'CSJ','Ingreso de armas a sala de audiencias','Armas','2026-06-07 11:50:38',1),(17,'CSJ','Agresión entre partes procesales','Agresión entre partes','2026-06-07 11:50:38',2),(18,'CSJ','Desacato con alteración del orden','Desacato','2026-06-07 11:50:38',2),(19,'CSJ','Amenaza a testigos o víctimas','Amenaza a testigos','2026-06-07 11:50:38',1),(20,'CSJ','Coacción a jurado o perito','Coacción','2026-06-07 11:50:38',1),(21,'CSJ','Presión indebida sobre decisiones judiciales','Presión judicial','2026-06-07 11:50:38',1);
/*!40000 ALTER TABLE `eventos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `genero`
--

DROP TABLE IF EXISTS `genero`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `genero` (
  `ID_genero` int NOT NULL AUTO_INCREMENT,
  `Descripcion_genero` varchar(80) NOT NULL,
  `Fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ID_Agencia` varchar(5) NOT NULL,
  PRIMARY KEY (`ID_genero`),
  UNIQUE KEY `uq_genero_descripcion_agencia` (`Descripcion_genero`,`ID_Agencia`),
  KEY `idx_agencia` (`ID_Agencia`),
  KEY `idx_fecha` (`Fecha`),
  CONSTRAINT `fk_genero_agencia` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `genero`
--

LOCK TABLES `genero` WRITE;
/*!40000 ALTER TABLE `genero` DISABLE KEYS */;
INSERT INTO `genero` VALUES (1,'Femenino','2026-06-04 15:37:45','csj'),(2,'Masculino','2026-06-04 15:37:45','csj'),(3,'No Binario','2026-06-04 15:37:45','csj'),(4,'Trans','2026-06-04 15:37:45','csj'),(5,'No Se Identifica','2026-06-04 15:37:45','csj'),(6,'Femenino','2026-06-04 15:38:23','pol'),(7,'Masculino','2026-06-04 15:38:23','pol'),(8,'No Binario','2026-06-04 15:38:23','pol'),(9,'Trans','2026-06-04 15:38:23','pol'),(10,'No Se Identifica','2026-06-04 15:38:23','pol');
/*!40000 ALTER TABLE `genero` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `catalogo_persona`
--

DROP TABLE IF EXISTS `catalogo_persona`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `catalogo_persona` (
  `id` varchar(20) NOT NULL,
  `name` varchar(150) DEFAULT NULL,
  `document_id` varchar(30) DEFAULT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `address` varchar(255) DEFAULT NULL,
  `email` varchar(150) DEFAULT NULL,
  `birth_date` date DEFAULT NULL,
  `notes` text,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `primer_nombre` varchar(50) DEFAULT NULL,
  `segundo_nombre` varchar(50) DEFAULT NULL,
  `primer_apellido` varchar(50) DEFAULT NULL,
  `segundo_apellido` varchar(50) DEFAULT NULL,
  `id_rol_p` int DEFAULT NULL,
  `contacto` varchar(100) DEFAULT NULL,
  `tipo_documento` varchar(20) DEFAULT NULL,
  `numero_documento` varchar(30) DEFAULT NULL,
  `comentarios` varchar(200) DEFAULT NULL,
  `id_genero` int DEFAULT NULL,
  `id_agencia` varchar(5) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_people_phone` (`phone`),
  KEY `idx_people_document` (`document_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `catalogo_persona`
--

LOCK TABLES `catalogo_persona` WRITE;
/*!40000 ALTER TABLE `catalogo_persona` DISABLE KEYS */;
INSERT INTO `catalogo_persona` VALUES ('PER-001','ana rodriguez','1102645987','3026548769','',NULL,NULL,'juez de la republica','2026-06-06 21:41:30','ana',NULL,'rodriguez',NULL,2,'3026548769','CC','1102645987','juez de la republica',1,'CSJ');
/*!40000 ALTER TABLE `catalogo_persona` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `incidentes`
--

DROP TABLE IF EXISTS `incidentes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `incidentes` (
  `ID_incidente` int NOT NULL AUTO_INCREMENT,
  `FechaHora` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ID_evento` int NOT NULL,
  `ID_Origen` int NOT NULL,
  `ANI` varchar(50) DEFAULT NULL,
  `Direccion` varchar(150) NOT NULL,
  `Latitud` double NOT NULL,
  `Longitud` double NOT NULL,
  `ID_persona` int DEFAULT NULL,
  `ID_vehiculo` int DEFAULT NULL,
  `IDAgencias` varchar(5) NOT NULL,
  `ID_visible` varchar(20) DEFAULT NULL,
  `id_departamento` int DEFAULT NULL,
  `id_municipio` int DEFAULT NULL,
  `codigo_oficio_tramite` varchar(50) DEFAULT NULL,
  `destino` varchar(200) DEFAULT NULL,
  `comentario_destino` text,
  `ID_estado` int NOT NULL,
  `Comentario_estado` varchar(200) DEFAULT NULL,
  `ID_prioridad` int NOT NULL,
  `ID_lugar` int DEFAULT NULL,
  PRIMARY KEY (`ID_incidente`),
  UNIQUE KEY `ID_visible` (`ID_visible`),
  KEY `FK_Incidentes_Eventos` (`ID_evento`),
  KEY `FK_Incidentes_Origen` (`ID_Origen`),
  KEY `FK_incidentes_agencias` (`IDAgencias`),
  KEY `FK_Incidentes_Personas` (`ID_persona`),
  KEY `FK_Incidentes_Vehiculos` (`ID_vehiculo`),
  KEY `idx_id_departamento` (`id_departamento`),
  KEY `idx_id_municipio` (`id_municipio`),
  KEY `fk_estado_incidente` (`ID_estado`),
  KEY `idx_lugar` (`ID_lugar`),
  CONSTRAINT `fk_estado_incidente` FOREIGN KEY (`ID_estado`) REFERENCES `estadosincidentes` (`ID_estado`),
  CONSTRAINT `fk_incidente_departamento` FOREIGN KEY (`id_departamento`) REFERENCES `departamentos` (`id_departamento`) ON DELETE RESTRICT,
  CONSTRAINT `fk_incidente_lugar` FOREIGN KEY (`ID_lugar`) REFERENCES `lugares` (`ID_lugar`),
  CONSTRAINT `fk_incidente_municipio` FOREIGN KEY (`id_municipio`) REFERENCES `municipios` (`id_municipio`) ON DELETE RESTRICT,
  CONSTRAINT `FK_incidentes_agencias` FOREIGN KEY (`IDAgencias`) REFERENCES `agencias` (`IDAgencias`),
  CONSTRAINT `FK_Incidentes_Eventos` FOREIGN KEY (`ID_evento`) REFERENCES `eventos` (`ID_evento`),
  CONSTRAINT `FK_Incidentes_Origen` FOREIGN KEY (`ID_Origen`) REFERENCES `origen` (`ID_Origen`),
  CONSTRAINT `FK_Incidentes_Personas` FOREIGN KEY (`ID_persona`) REFERENCES `personas` (`ID_persona`),
  CONSTRAINT `FK_Incidentes_Vehiculos` FOREIGN KEY (`ID_vehiculo`) REFERENCES `vehiculos` (`ID_vehiculo`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `incidentes`
--

LOCK TABLES `incidentes` WRITE;
/*!40000 ALTER TABLE `incidentes` DISABLE KEYS */;
/*!40000 ALTER TABLE `incidentes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `lugares`
--

DROP TABLE IF EXISTS `lugares`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `lugares` (
  `ID_lugar` int NOT NULL AUTO_INCREMENT,
  `Nombre_lugar` varchar(100) NOT NULL,
  `Direccion_lugar` varchar(100) NOT NULL,
  `ID_departamento` int DEFAULT NULL,
  `ID_municipio` int DEFAULT NULL,
  `Contacto` varchar(100) DEFAULT NULL,
  `ID_Rol_lugar` int NOT NULL,
  `ID_incidente` int NOT NULL,
  `Fecha_registro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_lugar`),
  KEY `idx_departamento` (`ID_departamento`),
  KEY `idx_municipio` (`ID_municipio`),
  KEY `idx_rol` (`ID_Rol_lugar`),
  KEY `idx_incidente` (`ID_incidente`),
  KEY `idx_fecha` (`Fecha_registro`),
  CONSTRAINT `fk_lugar_departamento` FOREIGN KEY (`ID_departamento`) REFERENCES `departamentos` (`id_departamento`),
  CONSTRAINT `fk_lugar_incidente` FOREIGN KEY (`ID_incidente`) REFERENCES `incidentes` (`ID_incidente`),
  CONSTRAINT `fk_lugar_municipio` FOREIGN KEY (`ID_municipio`) REFERENCES `municipios` (`id_municipio`),
  CONSTRAINT `fk_lugar_rol` FOREIGN KEY (`ID_Rol_lugar`) REFERENCES `roles_lugar` (`ID_Rol_Lugar`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `lugares`
--

LOCK TABLES `lugares` WRITE;
/*!40000 ALTER TABLE `lugares` DISABLE KEYS */;
/*!40000 ALTER TABLE `lugares` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `modules`
--

DROP TABLE IF EXISTS `modules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `modules` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `modules`
--

LOCK TABLES `modules` WRITE;
/*!40000 ALTER TABLE `modules` DISABLE KEYS */;
INSERT INTO `modules` VALUES (4,'Administración'),(1,'Dashboard'),(2,'Incidentes'),(3,'Reportes');
/*!40000 ALTER TABLE `modules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `municipios`
--

DROP TABLE IF EXISTS `municipios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `municipios` (
  `id_municipio` int NOT NULL AUTO_INCREMENT,
  `codigo_departamento` char(3) NOT NULL,
  `codigo_municipio` varchar(5) NOT NULL,
  `nombre_municipio` varchar(120) NOT NULL,
  `IDAgencias` varchar(5) NOT NULL,
  PRIMARY KEY (`id_municipio`),
  UNIQUE KEY `uk_municipios_departamento_nombre_agencia` (`codigo_departamento`,`nombre_municipio`,`IDAgencias`),
  UNIQUE KEY `uk_municipios_departamento_codigo_agencia` (`codigo_departamento`,`codigo_municipio`,`IDAgencias`),
  KEY `idx_municipios_departamento` (`codigo_departamento`),
  KEY `idx_municipios_agencia` (`IDAgencias`),
  KEY `idx_codigo_municipio` (`codigo_municipio`),
  CONSTRAINT `municipios_ibfk_1` FOREIGN KEY (`codigo_departamento`) REFERENCES `departamentos` (`codigo_departamento`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `municipios_ibfk_2` FOREIGN KEY (`IDAgencias`) REFERENCES `agencias` (`IDAgencias`) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1123 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `municipios`
--

LOCK TABLES `municipios` WRITE;
/*!40000 ALTER TABLE `municipios` DISABLE KEYS */;
INSERT INTO `municipios` VALUES (1,'05','05001','MEDELLÍN','CSJ'),(2,'05','05002','ABEJORRAL','CSJ'),(3,'05','05004','ABRIAQUÍ','CSJ'),(4,'05','05021','ALEJANDRÍA','CSJ'),(5,'05','05030','AMAGÁ','CSJ'),(6,'05','05031','AMALFI','CSJ'),(7,'05','05034','ANDES','CSJ'),(8,'05','05036','ANGELÓPOLIS','CSJ'),(9,'05','05038','ANGOSTURA','CSJ'),(10,'05','05040','ANORÍ','CSJ'),(11,'05','05042','SANTA FÉ DE ANTIOQUIA','CSJ'),(12,'05','05044','ANZÁ','CSJ'),(13,'05','05045','APARTADÓ','CSJ'),(14,'05','05051','ARBOLETES','CSJ'),(15,'05','05055','ARGELIA','CSJ'),(16,'05','05059','ARMENIA','CSJ'),(17,'05','05079','BARBOSA','CSJ'),(18,'05','05086','BELMIRA','CSJ'),(19,'05','05088','BELLO','CSJ'),(20,'05','05091','BETANIA','CSJ'),(21,'05','05093','BETULIA','CSJ'),(22,'05','05101','CIUDAD BOLÍVAR','CSJ'),(23,'05','05107','BRICEÑO','CSJ'),(24,'05','05113','BURITICÁ','CSJ'),(25,'05','05120','CÁCERES','CSJ'),(26,'05','05125','CAICEDO','CSJ'),(27,'05','05129','CALDAS','CSJ'),(28,'05','05134','CAMPAMENTO','CSJ'),(29,'05','05138','CAÑASGORDAS','CSJ'),(30,'05','05142','CARACOLÍ','CSJ'),(31,'05','05145','CARAMANTA','CSJ'),(32,'05','05147','CAREPA','CSJ'),(33,'05','05148','EL CARMEN DE VIBORAL','CSJ'),(34,'05','05150','CAROLINA','CSJ'),(35,'05','05154','CAUCASIA','CSJ'),(36,'05','05172','CHIGORODÓ','CSJ'),(37,'05','05190','CISNEROS','CSJ'),(38,'05','05197','COCORNÁ','CSJ'),(39,'05','05206','CONCEPCIÓN','CSJ'),(40,'05','05209','CONCORDIA','CSJ'),(41,'05','05212','COPACABANA','CSJ'),(42,'05','05234','DABEIBA','CSJ'),(43,'05','05237','DONMATÍAS','CSJ'),(44,'05','05240','EBÉJICO','CSJ'),(45,'05','05250','EL BAGRE','CSJ'),(46,'05','05264','ENTRERRÍOS','CSJ'),(47,'05','05266','ENVIGADO','CSJ'),(48,'05','05282','FREDONIA','CSJ'),(49,'05','05284','FRONTINO','CSJ'),(50,'05','05306','GIRALDO','CSJ'),(51,'05','05308','GIRARDOTA','CSJ'),(52,'05','05310','GÓMEZ PLATA','CSJ'),(53,'05','05313','GRANADA','CSJ'),(54,'05','05315','GUADALUPE','CSJ'),(55,'05','05318','GUARNE','CSJ'),(56,'05','05321','GUATAPÉ','CSJ'),(57,'05','05347','HELICONIA','CSJ'),(58,'05','05353','HISPANIA','CSJ'),(59,'05','05360','ITAGÜÍ','CSJ'),(60,'05','05361','ITUANGO','CSJ'),(61,'05','05364','JARDÍN','CSJ'),(62,'05','05368','JERICÓ','CSJ'),(63,'05','05376','LA CEJA','CSJ'),(64,'05','05380','LA ESTRELLA','CSJ'),(65,'05','05390','LA PINTADA','CSJ'),(66,'05','05400','LA UNIÓN','CSJ'),(67,'05','05411','LIBORINA','CSJ'),(68,'05','05425','MACEO','CSJ'),(69,'05','05440','MARINILLA','CSJ'),(70,'05','05467','MONTEBELLO','CSJ'),(71,'05','05475','MURINDÓ','CSJ'),(72,'05','05480','MUTATÁ','CSJ'),(73,'05','05483','NARIÑO','CSJ'),(74,'05','05490','NECOCLÍ','CSJ'),(75,'05','05495','NECHÍ','CSJ'),(76,'05','05501','OLAYA','CSJ'),(77,'05','05541','PEÑOL','CSJ'),(78,'05','05543','PEQUE','CSJ'),(79,'05','05576','PUEBLORRICO','CSJ'),(80,'05','05579','PUERTO BERRÍO','CSJ'),(81,'05','05585','PUERTO NARE','CSJ'),(82,'05','05591','PUERTO TRIUNFO','CSJ'),(83,'05','05604','REMEDIOS','CSJ'),(84,'05','05607','RETIRO','CSJ'),(85,'05','05615','RIONEGRO','CSJ'),(86,'05','05628','SABANALARGA','CSJ'),(87,'05','05631','SABANETA','CSJ'),(88,'05','05642','SALGAR','CSJ'),(89,'05','05647','SAN ANDRÉS DE CUERQUÍA','CSJ'),(90,'05','05649','SAN CARLOS','CSJ'),(91,'05','05652','SAN FRANCISCO','CSJ'),(92,'05','05656','SAN JERÓNIMO','CSJ'),(93,'05','05658','SAN JOSÉ DE LA MONTAÑA','CSJ'),(94,'05','05659','SAN JUAN DE URABÁ','CSJ'),(95,'05','05660','SAN LUIS','CSJ'),(96,'05','05664','SAN PEDRO DE LOS MILAGROS','CSJ'),(97,'05','05665','SAN PEDRO DE URABÁ','CSJ'),(98,'05','05667','SAN RAFAEL','CSJ'),(99,'05','05670','SAN ROQUE','CSJ'),(100,'05','05674','SAN VICENTE FERRER','CSJ'),(101,'05','05679','SANTA BÁRBARA','CSJ'),(102,'05','05686','SANTA ROSA DE OSOS','CSJ'),(103,'05','05690','SANTO DOMINGO','CSJ'),(104,'05','05697','EL SANTUARIO','CSJ'),(105,'05','05736','SEGOVIA','CSJ'),(106,'05','05756','SONSÓN','CSJ'),(107,'05','05761','SOPETRÁN','CSJ'),(108,'05','05789','TÁMESIS','CSJ'),(109,'05','05790','TARAZÁ','CSJ'),(110,'05','05792','TARSO','CSJ'),(111,'05','05809','TITIRIBÍ','CSJ'),(112,'05','05819','TOLEDO','CSJ'),(113,'05','05837','TURBO','CSJ'),(114,'05','05842','URAMITA','CSJ'),(115,'05','05847','URRAO','CSJ'),(116,'05','05854','VALDIVIA','CSJ'),(117,'05','05856','VALPARAÍSO','CSJ'),(118,'05','05858','VEGACHÍ','CSJ'),(119,'05','05861','VENECIA','CSJ'),(120,'05','05873','VIGÍA DEL FUERTE','CSJ'),(121,'05','05885','YALÍ','CSJ'),(122,'05','05887','YARUMAL','CSJ'),(123,'05','05890','YOLOMBÓ','CSJ'),(124,'05','05893','YONDÓ','CSJ'),(125,'05','05895','ZARAGOZA','CSJ'),(126,'08','08001','BARRANQUILLA','CSJ'),(127,'08','08078','BARANOA','CSJ'),(128,'08','08137','CAMPO DE LA CRUZ','CSJ'),(129,'08','08141','CANDELARIA','CSJ'),(130,'08','08296','GALAPA','CSJ'),(131,'08','08372','JUAN DE ACOSTA','CSJ'),(132,'08','08421','LURUACO','CSJ'),(133,'08','08433','MALAMBO','CSJ'),(134,'08','08436','MANATÍ','CSJ'),(135,'08','08520','PALMAR DE VARELA','CSJ'),(136,'08','08549','PIOJÓ','CSJ'),(137,'08','08558','POLONUEVO','CSJ'),(138,'08','08560','PONEDERA','CSJ'),(139,'08','08573','PUERTO COLOMBIA','CSJ'),(140,'08','08606','REPELÓN','CSJ'),(141,'08','08634','SABANAGRANDE','CSJ'),(142,'08','08638','SABANALARGA','CSJ'),(143,'08','08675','SANTA LUCÍA','CSJ'),(144,'08','08685','SANTO TOMÁS','CSJ'),(145,'08','08758','SOLEDAD','CSJ'),(146,'08','08770','SUAN','CSJ'),(147,'08','08832','TUBARÁ','CSJ'),(148,'08','08849','USIACURÍ','CSJ'),(149,'11','11001','BOGOTÁ, D.C.','CSJ'),(150,'13','13001','CARTAGENA DE INDIAS','CSJ'),(151,'13','13006','ACHÍ','CSJ'),(152,'13','13030','ALTOS DEL ROSARIO','CSJ'),(153,'13','13042','ARENAL','CSJ'),(154,'13','13052','ARJONA','CSJ'),(155,'13','13062','ARROYOHONDO','CSJ'),(156,'13','13074','BARRANCO DE LOBA','CSJ'),(157,'13','13140','CALAMAR','CSJ'),(158,'13','13160','CANTAGALLO','CSJ'),(159,'13','13188','CICUCO','CSJ'),(160,'13','13212','CÓRDOBA','CSJ'),(161,'13','13222','CLEMENCIA','CSJ'),(162,'13','13244','EL CARMEN DE BOLÍVAR','CSJ'),(163,'13','13248','EL GUAMO','CSJ'),(164,'13','13268','EL PEÑÓN','CSJ'),(165,'13','13300','HATILLO DE LOBA','CSJ'),(166,'13','13430','MAGANGUÉ','CSJ'),(167,'13','13433','MAHATES','CSJ'),(168,'13','13440','MARGARITA','CSJ'),(169,'13','13442','MARÍA LA BAJA','CSJ'),(170,'13','13458','MONTECRISTO','CSJ'),(171,'13','13468','SANTA CRUZ DE MOMPOX','CSJ'),(172,'13','13473','MORALES','CSJ'),(173,'13','13490','NOROSÍ','CSJ'),(174,'13','13549','PINILLOS','CSJ'),(175,'13','13580','REGIDOR','CSJ'),(176,'13','13600','RÍO VIEJO','CSJ'),(177,'13','13620','SAN CRISTÓBAL','CSJ'),(178,'13','13647','SAN ESTANISLAO','CSJ'),(179,'13','13650','SAN FERNANDO','CSJ'),(180,'13','13654','SAN JACINTO','CSJ'),(181,'13','13655','SAN JACINTO DEL CAUCA','CSJ'),(182,'13','13657','SAN JUAN NEPOMUCENO','CSJ'),(183,'13','13667','SAN MARTÍN DE LOBA','CSJ'),(184,'13','13670','SAN PABLO','CSJ'),(185,'13','13673','SANTA CATALINA','CSJ'),(186,'13','13683','SANTA ROSA','CSJ'),(187,'13','13688','SANTA ROSA DEL SUR','CSJ'),(188,'13','13744','SIMITÍ','CSJ'),(189,'13','13760','SOPLAVIENTO','CSJ'),(190,'13','13780','TALAIGUA NUEVO','CSJ'),(191,'13','13810','TIQUISIO','CSJ'),(192,'13','13836','TURBACO','CSJ'),(193,'13','13838','TURBANÁ','CSJ'),(194,'13','13873','VILLANUEVA','CSJ'),(195,'13','13894','ZAMBRANO','CSJ'),(196,'15','15001','TUNJA','CSJ'),(197,'15','15022','ALMEIDA','CSJ'),(198,'15','15047','AQUITANIA','CSJ'),(199,'15','15051','ARCABUCO','CSJ'),(200,'15','15087','BELÉN','CSJ'),(201,'15','15090','BERBEO','CSJ'),(202,'15','15092','BETÉITIVA','CSJ'),(203,'15','15097','BOAVITA','CSJ'),(204,'15','15104','BOYACÁ','CSJ'),(205,'15','15106','BRICEÑO','CSJ'),(206,'15','15109','BUENAVISTA','CSJ'),(207,'15','15114','BUSBANZÁ','CSJ'),(208,'15','15131','CALDAS','CSJ'),(209,'15','15135','CAMPOHERMOSO','CSJ'),(210,'15','15162','CERINZA','CSJ'),(211,'15','15172','CHINAVITA','CSJ'),(212,'15','15176','CHIQUINQUIRÁ','CSJ'),(213,'15','15180','CHISCAS','CSJ'),(214,'15','15183','CHITA','CSJ'),(215,'15','15185','CHITARAQUE','CSJ'),(216,'15','15187','CHIVATÁ','CSJ'),(217,'15','15189','CIÉNEGA','CSJ'),(218,'15','15204','CÓMBITA','CSJ'),(219,'15','15212','COPER','CSJ'),(220,'15','15215','CORRALES','CSJ'),(221,'15','15218','COVARACHÍA','CSJ'),(222,'15','15223','CUBARÁ','CSJ'),(223,'15','15224','CUCAITA','CSJ'),(224,'15','15226','CUÍTIVA','CSJ'),(225,'15','15232','CHÍQUIZA','CSJ'),(226,'15','15236','CHIVOR','CSJ'),(227,'15','15238','DUITAMA','CSJ'),(228,'15','15244','EL COCUY','CSJ'),(229,'15','15248','EL ESPINO','CSJ'),(230,'15','15272','FIRAVITOBA','CSJ'),(231,'15','15276','FLORESTA','CSJ'),(232,'15','15293','GACHANTIVÁ','CSJ'),(233,'15','15296','GÁMEZA','CSJ'),(234,'15','15299','GARAGOA','CSJ'),(235,'15','15317','GUACAMAYAS','CSJ'),(236,'15','15322','GUATEQUE','CSJ'),(237,'15','15325','GUAYATÁ','CSJ'),(238,'15','15332','GÜICÁN DE LA SIERRA','CSJ'),(239,'15','15362','IZA','CSJ'),(240,'15','15367','JENESANO','CSJ'),(241,'15','15368','JERICÓ','CSJ'),(242,'15','15377','LABRANZAGRANDE','CSJ'),(243,'15','15380','LA CAPILLA','CSJ'),(244,'15','15401','LA VICTORIA','CSJ'),(245,'15','15403','LA UVITA','CSJ'),(246,'15','15407','VILLA DE LEYVA','CSJ'),(247,'15','15425','MACANAL','CSJ'),(248,'15','15442','MARIPÍ','CSJ'),(249,'15','15455','MIRAFLORES','CSJ'),(250,'15','15464','MONGUA','CSJ'),(251,'15','15466','MONGUÍ','CSJ'),(252,'15','15469','MONIQUIRÁ','CSJ'),(253,'15','15476','MOTAVITA','CSJ'),(254,'15','15480','MUZO','CSJ'),(255,'15','15491','NOBSA','CSJ'),(256,'15','15494','NUEVO COLÓN','CSJ'),(257,'15','15500','OICATÁ','CSJ'),(258,'15','15507','OTANCHE','CSJ'),(259,'15','15511','PACHAVITA','CSJ'),(260,'15','15514','PÁEZ','CSJ'),(261,'15','15516','PAIPA','CSJ'),(262,'15','15518','PAJARITO','CSJ'),(263,'15','15522','PANQUEBA','CSJ'),(264,'15','15531','PAUNA','CSJ'),(265,'15','15533','PAYA','CSJ'),(266,'15','15537','PAZ DE RÍO','CSJ'),(267,'15','15542','PESCA','CSJ'),(268,'15','15550','PISBA','CSJ'),(269,'15','15572','PUERTO BOYACÁ','CSJ'),(270,'15','15580','QUÍPAMA','CSJ'),(271,'15','15599','RAMIRIQUÍ','CSJ'),(272,'15','15600','RÁQUIRA','CSJ'),(273,'15','15621','RONDÓN','CSJ'),(274,'15','15632','SABOYÁ','CSJ'),(275,'15','15638','SÁCHICA','CSJ'),(276,'15','15646','SAMACÁ','CSJ'),(277,'15','15660','SAN EDUARDO','CSJ'),(278,'15','15664','SAN JOSÉ DE PARE','CSJ'),(279,'15','15667','SAN LUIS DE GACENO','CSJ'),(280,'15','15673','SAN MATEO','CSJ'),(281,'15','15676','SAN MIGUEL DE SEMA','CSJ'),(282,'15','15681','SAN PABLO DE BORBUR','CSJ'),(283,'15','15686','SANTANA','CSJ'),(284,'15','15690','SANTA MARÍA','CSJ'),(285,'15','15693','SANTA ROSA DE VITERBO','CSJ'),(286,'15','15696','SANTA SOFÍA','CSJ'),(287,'15','15720','SATIVANORTE','CSJ'),(288,'15','15723','SATIVASUR','CSJ'),(289,'15','15740','SIACHOQUE','CSJ'),(290,'15','15753','SOATÁ','CSJ'),(291,'15','15755','SOCOTÁ','CSJ'),(292,'15','15757','SOCHA','CSJ'),(293,'15','15759','SOGAMOSO','CSJ'),(294,'15','15761','SOMONDOCO','CSJ'),(295,'15','15762','SORA','CSJ'),(296,'15','15763','SOTAQUIRÁ','CSJ'),(297,'15','15764','SORACÁ','CSJ'),(298,'15','15774','SUSACÓN','CSJ'),(299,'15','15776','SUTAMARCHÁN','CSJ'),(300,'15','15778','SUTATENZA','CSJ'),(301,'15','15790','TASCO','CSJ'),(302,'15','15798','TENZA','CSJ'),(303,'15','15804','TIBANÁ','CSJ'),(304,'15','15806','TIBASOSA','CSJ'),(305,'15','15808','TINJACÁ','CSJ'),(306,'15','15810','TIPACOQUE','CSJ'),(307,'15','15814','TOCA','CSJ'),(308,'15','15816','TOGÜÍ','CSJ'),(309,'15','15820','TÓPAGA','CSJ'),(310,'15','15822','TOTA','CSJ'),(311,'15','15832','TUNUNGUÁ','CSJ'),(312,'15','15835','TURMEQUÉ','CSJ'),(313,'15','15837','TUTA','CSJ'),(314,'15','15839','TUTAZÁ','CSJ'),(315,'15','15842','ÚMBITA','CSJ'),(316,'15','15861','VENTAQUEMADA','CSJ'),(317,'15','15879','VIRACACHÁ','CSJ'),(318,'15','15897','ZETAQUIRA','CSJ'),(319,'17','17001','MANIZALES','CSJ'),(320,'17','17013','AGUADAS','CSJ'),(321,'17','17042','ANSERMA','CSJ'),(322,'17','17050','ARANZAZU','CSJ'),(323,'17','17088','BELALCÁZAR','CSJ'),(324,'17','17174','CHINCHINÁ','CSJ'),(325,'17','17272','FILADELFIA','CSJ'),(326,'17','17380','LA DORADA','CSJ'),(327,'17','17388','LA MERCED','CSJ'),(328,'17','17433','MANZANARES','CSJ'),(329,'17','17442','MARMATO','CSJ'),(330,'17','17444','MARQUETALIA','CSJ'),(331,'17','17446','MARULANDA','CSJ'),(332,'17','17486','NEIRA','CSJ'),(333,'17','17495','NORCASIA','CSJ'),(334,'17','17513','PÁCORA','CSJ'),(335,'17','17524','PALESTINA','CSJ'),(336,'17','17541','PENSILVANIA','CSJ'),(337,'17','17614','RIOSUCIO','CSJ'),(338,'17','17616','RISARALDA','CSJ'),(339,'17','17653','SALAMINA','CSJ'),(340,'17','17662','SAMANÁ','CSJ'),(341,'17','17665','SAN JOSÉ','CSJ'),(342,'17','17777','SUPÍA','CSJ'),(343,'17','17867','VICTORIA','CSJ'),(344,'17','17873','VILLAMARÍA','CSJ'),(345,'17','17877','VITERBO','CSJ'),(346,'18','18001','FLORENCIA','CSJ'),(347,'18','18029','ALBANIA','CSJ'),(348,'18','18094','BELÉN DE LOS ANDAQUÍES','CSJ'),(349,'18','18150','CARTAGENA DEL CHAIRÁ','CSJ'),(350,'18','18205','CURILLO','CSJ'),(351,'18','18247','EL DONCELLO','CSJ'),(352,'18','18256','EL PAUJÍL','CSJ'),(353,'18','18410','LA MONTAÑITA','CSJ'),(354,'18','18460','MILÁN','CSJ'),(355,'18','18479','MORELIA','CSJ'),(356,'18','18592','PUERTO RICO','CSJ'),(357,'18','18610','SAN JOSÉ DEL FRAGUA','CSJ'),(358,'18','18753','SAN VICENTE DEL CAGUÁN','CSJ'),(359,'18','18756','SOLANO','CSJ'),(360,'18','18785','SOLITA','CSJ'),(361,'18','18860','VALPARAÍSO','CSJ'),(362,'19','19001','POPAYÁN','CSJ'),(363,'19','19022','ALMAGUER','CSJ'),(364,'19','19050','ARGELIA','CSJ'),(365,'19','19075','BALBOA','CSJ'),(366,'19','19100','BOLÍVAR','CSJ'),(367,'19','19110','BUENOS AIRES','CSJ'),(368,'19','19130','CAJIBÍO','CSJ'),(369,'19','19137','CALDONO','CSJ'),(370,'19','19142','CALOTO','CSJ'),(371,'19','19212','CORINTO','CSJ'),(372,'19','19256','EL TAMBO','CSJ'),(373,'19','19290','FLORENCIA','CSJ'),(374,'19','19300','GUACHENÉ','CSJ'),(375,'19','19318','GUAPI','CSJ'),(376,'19','19355','INZÁ','CSJ'),(377,'19','19364','JAMBALÓ','CSJ'),(378,'19','19392','LA SIERRA','CSJ'),(379,'19','19397','LA VEGA','CSJ'),(380,'19','19418','LÓPEZ DE MICAY','CSJ'),(381,'19','19450','MERCADERES','CSJ'),(382,'19','19455','MIRANDA','CSJ'),(383,'19','19473','MORALES','CSJ'),(384,'19','19513','PADILLA','CSJ'),(385,'19','19517','PÁEZ','CSJ'),(386,'19','19532','PATÍA','CSJ'),(387,'19','19533','PIAMONTE','CSJ'),(388,'19','19548','PIENDAMÓ - TUNÍA','CSJ'),(389,'19','19573','PUERTO TEJADA','CSJ'),(390,'19','19585','PURACÉ','CSJ'),(391,'19','19622','ROSAS','CSJ'),(392,'19','19693','SAN SEBASTIÁN','CSJ'),(393,'19','19698','SANTANDER DE QUILICHAO','CSJ'),(394,'19','19701','SANTA ROSA','CSJ'),(395,'19','19743','SILVIA','CSJ'),(396,'19','19760','SOTARÁ - PAISPAMBA','CSJ'),(397,'19','19780','SUÁREZ','CSJ'),(398,'19','19785','SUCRE','CSJ'),(399,'19','19807','TIMBÍO','CSJ'),(400,'19','19809','TIMBIQUÍ','CSJ'),(401,'19','19821','TORIBÍO','CSJ'),(402,'19','19824','TOTORÓ','CSJ'),(403,'19','19845','VILLA RICA','CSJ'),(404,'20','20001','VALLEDUPAR','CSJ'),(405,'20','20011','AGUACHICA','CSJ'),(406,'20','20013','AGUSTÍN CODAZZI','CSJ'),(407,'20','20032','ASTREA','CSJ'),(408,'20','20045','BECERRIL','CSJ'),(409,'20','20060','BOSCONIA','CSJ'),(410,'20','20175','CHIMICHAGUA','CSJ'),(411,'20','20178','CHIRIGUANÁ','CSJ'),(412,'20','20228','CURUMANÍ','CSJ'),(413,'20','20238','EL COPEY','CSJ'),(414,'20','20250','EL PASO','CSJ'),(415,'20','20295','GAMARRA','CSJ'),(416,'20','20310','GONZÁLEZ','CSJ'),(417,'20','20383','LA GLORIA','CSJ'),(418,'20','20400','LA JAGUA DE IBIRICO','CSJ'),(419,'20','20443','MANAURE BALCÓN DEL CESAR','CSJ'),(420,'20','20517','PAILITAS','CSJ'),(421,'20','20550','PELAYA','CSJ'),(422,'20','20570','PUEBLO BELLO','CSJ'),(423,'20','20614','RÍO DE ORO','CSJ'),(424,'20','20621','LA PAZ','CSJ'),(425,'20','20710','SAN ALBERTO','CSJ'),(426,'20','20750','SAN DIEGO','CSJ'),(427,'20','20770','SAN MARTÍN','CSJ'),(428,'20','20787','TAMALAMEQUE','CSJ'),(429,'23','23001','MONTERÍA','CSJ'),(430,'23','23068','AYAPEL','CSJ'),(431,'23','23079','BUENAVISTA','CSJ'),(432,'23','23090','CANALETE','CSJ'),(433,'23','23162','CERETÉ','CSJ'),(434,'23','23168','CHIMÁ','CSJ'),(435,'23','23182','CHINÚ','CSJ'),(436,'23','23189','CIÉNAGA DE ORO','CSJ'),(437,'23','23300','COTORRA','CSJ'),(438,'23','23350','LA APARTADA','CSJ'),(439,'23','23417','LORICA','CSJ'),(440,'23','23419','LOS CÓRDOBAS','CSJ'),(441,'23','23464','MOMIL','CSJ'),(442,'23','23466','MONTELÍBANO','CSJ'),(443,'23','23500','MOÑITOS','CSJ'),(444,'23','23555','PLANETA RICA','CSJ'),(445,'23','23570','PUEBLO NUEVO','CSJ'),(446,'23','23574','PUERTO ESCONDIDO','CSJ'),(447,'23','23580','PUERTO LIBERTADOR','CSJ'),(448,'23','23586','PURÍSIMA DE LA CONCEPCIÓN','CSJ'),(449,'23','23660','SAHAGÚN','CSJ'),(450,'23','23670','SAN ANDRÉS DE SOTAVENTO','CSJ'),(451,'23','23672','SAN ANTERO','CSJ'),(452,'23','23675','SAN BERNARDO DEL VIENTO','CSJ'),(453,'23','23678','SAN CARLOS','CSJ'),(454,'23','23682','SAN JOSÉ DE URÉ','CSJ'),(455,'23','23686','SAN PELAYO','CSJ'),(456,'23','23807','TIERRALTA','CSJ'),(457,'23','23815','TUCHÍN','CSJ'),(458,'23','23855','VALENCIA','CSJ'),(459,'25','25001','AGUA DE DIOS','CSJ'),(460,'25','25019','ALBÁN','CSJ'),(461,'25','25035','ANAPOIMA','CSJ'),(462,'25','25040','ANOLAIMA','CSJ'),(463,'25','25053','ARBELÁEZ','CSJ'),(464,'25','25086','BELTRÁN','CSJ'),(465,'25','25095','BITUIMA','CSJ'),(466,'25','25099','BOJACÁ','CSJ'),(467,'25','25120','CABRERA','CSJ'),(468,'25','25123','CACHIPAY','CSJ'),(469,'25','25126','CAJICÁ','CSJ'),(470,'25','25148','CAPARRAPÍ','CSJ'),(471,'25','25151','CÁQUEZA','CSJ'),(472,'25','25154','CARMEN DE CARUPA','CSJ'),(473,'25','25168','CHAGUANÍ','CSJ'),(474,'25','25175','CHÍA','CSJ'),(475,'25','25178','CHIPAQUE','CSJ'),(476,'25','25181','CHOACHÍ','CSJ'),(477,'25','25183','CHOCONTÁ','CSJ'),(478,'25','25200','COGUA','CSJ'),(479,'25','25214','COTA','CSJ'),(480,'25','25224','CUCUNUBÁ','CSJ'),(481,'25','25245','EL COLEGIO','CSJ'),(482,'25','25258','EL PEÑÓN','CSJ'),(483,'25','25260','EL ROSAL','CSJ'),(484,'25','25269','FACATATIVÁ','CSJ'),(485,'25','25279','FÓMEQUE','CSJ'),(486,'25','25281','FOSCA','CSJ'),(487,'25','25286','FUNZA','CSJ'),(488,'25','25288','FÚQUENE','CSJ'),(489,'25','25290','FUSAGASUGÁ','CSJ'),(490,'25','25293','GACHALÁ','CSJ'),(491,'25','25295','GACHANCIPÁ','CSJ'),(492,'25','25297','GACHETÁ','CSJ'),(493,'25','25299','GAMA','CSJ'),(494,'25','25307','GIRARDOT','CSJ'),(495,'25','25312','GRANADA','CSJ'),(496,'25','25317','GUACHETÁ','CSJ'),(497,'25','25320','GUADUAS','CSJ'),(498,'25','25322','GUASCA','CSJ'),(499,'25','25324','GUATAQUÍ','CSJ'),(500,'25','25326','GUATAVITA','CSJ'),(501,'25','25328','GUAYABAL DE SÍQUIMA','CSJ'),(502,'25','25335','GUAYABETAL','CSJ'),(503,'25','25339','GUTIÉRREZ','CSJ'),(504,'25','25368','JERUSALÉN','CSJ'),(505,'25','25372','JUNÍN','CSJ'),(506,'25','25377','LA CALERA','CSJ'),(507,'25','25386','LA MESA','CSJ'),(508,'25','25394','LA PALMA','CSJ'),(509,'25','25398','LA PEÑA','CSJ'),(510,'25','25402','LA VEGA','CSJ'),(511,'25','25407','LENGUAZAQUE','CSJ'),(512,'25','25426','MACHETÁ','CSJ'),(513,'25','25430','MADRID','CSJ'),(514,'25','25436','MANTA','CSJ'),(515,'25','25438','MEDINA','CSJ'),(516,'25','25473','MOSQUERA','CSJ'),(517,'25','25483','NARIÑO','CSJ'),(518,'25','25486','NEMOCÓN','CSJ'),(519,'25','25488','NILO','CSJ'),(520,'25','25489','NIMAIMA','CSJ'),(521,'25','25491','NOCAIMA','CSJ'),(522,'25','25506','VENECIA','CSJ'),(523,'25','25513','PACHO','CSJ'),(524,'25','25518','PAIME','CSJ'),(525,'25','25524','PANDI','CSJ'),(526,'25','25530','PARATEBUENO','CSJ'),(527,'25','25535','PASCA','CSJ'),(528,'25','25572','PUERTO SALGAR','CSJ'),(529,'25','25580','PULÍ','CSJ'),(530,'25','25592','QUEBRADANEGRA','CSJ'),(531,'25','25594','QUETAME','CSJ'),(532,'25','25596','QUIPILE','CSJ'),(533,'25','25599','APULO','CSJ'),(534,'25','25612','RICAURTE','CSJ'),(535,'25','25645','SAN ANTONIO DEL TEQUENDAMA','CSJ'),(536,'25','25649','SAN BERNARDO','CSJ'),(537,'25','25653','SAN CAYETANO','CSJ'),(538,'25','25658','SAN FRANCISCO','CSJ'),(539,'25','25662','SAN JUAN DE RIOSECO','CSJ'),(540,'25','25718','SASAIMA','CSJ'),(541,'25','25736','SESQUILÉ','CSJ'),(542,'25','25740','SIBATÉ','CSJ'),(543,'25','25743','SILVANIA','CSJ'),(544,'25','25745','SIMIJACA','CSJ'),(545,'25','25754','SOACHA','CSJ'),(546,'25','25758','SOPÓ','CSJ'),(547,'25','25769','SUBACHOQUE','CSJ'),(548,'25','25772','SUESCA','CSJ'),(549,'25','25777','SUPATÁ','CSJ'),(550,'25','25779','SUSA','CSJ'),(551,'25','25781','SUTATAUSA','CSJ'),(552,'25','25785','TABIO','CSJ'),(553,'25','25793','TAUSA','CSJ'),(554,'25','25797','TENA','CSJ'),(555,'25','25799','TENJO','CSJ'),(556,'25','25805','TIBACUY','CSJ'),(557,'25','25807','TIBIRITA','CSJ'),(558,'25','25815','TOCAIMA','CSJ'),(559,'25','25817','TOCANCIPÁ','CSJ'),(560,'25','25823','TOPAIPÍ','CSJ'),(561,'25','25839','UBALÁ','CSJ'),(562,'25','25841','UBAQUE','CSJ'),(563,'25','25843','VILLA DE SAN DIEGO DE UBATÉ','CSJ'),(564,'25','25845','UNE','CSJ'),(565,'25','25851','ÚTICA','CSJ'),(566,'25','25862','VERGARA','CSJ'),(567,'25','25867','VIANÍ','CSJ'),(568,'25','25871','VILLAGÓMEZ','CSJ'),(569,'25','25873','VILLAPINZÓN','CSJ'),(570,'25','25875','VILLETA','CSJ'),(571,'25','25878','VIOTÁ','CSJ'),(572,'25','25885','YACOPÍ','CSJ'),(573,'25','25898','ZIPACÓN','CSJ'),(574,'25','25899','ZIPAQUIRÁ','CSJ'),(575,'27','27001','QUIBDÓ','CSJ'),(576,'27','27006','ACANDÍ','CSJ'),(577,'27','27025','ALTO BAUDÓ','CSJ'),(578,'27','27050','ATRATO','CSJ'),(579,'27','27073','BAGADÓ','CSJ'),(580,'27','27075','BAHÍA SOLANO','CSJ'),(581,'27','27077','BAJO BAUDÓ','CSJ'),(582,'27','27099','BOJAYÁ','CSJ'),(583,'27','27135','EL CANTÓN DEL SAN PABLO','CSJ'),(584,'27','27150','CARMEN DEL DARIÉN','CSJ'),(585,'27','27160','CÉRTEGUI','CSJ'),(586,'27','27205','CONDOTO','CSJ'),(587,'27','27245','EL CARMEN DE ATRATO','CSJ'),(588,'27','27250','EL LITORAL DEL SAN JUAN','CSJ'),(589,'27','27361','ISTMINA','CSJ'),(590,'27','27372','JURADÓ','CSJ'),(591,'27','27413','LLORÓ','CSJ'),(592,'27','27425','MEDIO ATRATO','CSJ'),(593,'27','27430','MEDIO BAUDÓ','CSJ'),(594,'27','27450','MEDIO SAN JUAN','CSJ'),(595,'27','27491','NÓVITA','CSJ'),(596,'27','27493','NUEVO BELÉN DE BAJIRÁ','CSJ'),(597,'27','27495','NUQUÍ','CSJ'),(598,'27','27580','RÍO IRÓ','CSJ'),(599,'27','27600','RÍO QUITO','CSJ'),(600,'27','27615','RIOSUCIO','CSJ'),(601,'27','27660','SAN JOSÉ DEL PALMAR','CSJ'),(602,'27','27745','SIPÍ','CSJ'),(603,'27','27787','TADÓ','CSJ'),(604,'27','27800','UNGUÍA','CSJ'),(605,'27','27810','UNIÓN PANAMERICANA','CSJ'),(606,'41','41001','NEIVA','CSJ'),(607,'41','41006','ACEVEDO','CSJ'),(608,'41','41013','AGRADO','CSJ'),(609,'41','41016','AIPE','CSJ'),(610,'41','41020','ALGECIRAS','CSJ'),(611,'41','41026','ALTAMIRA','CSJ'),(612,'41','41078','BARAYA','CSJ'),(613,'41','41132','CAMPOALEGRE','CSJ'),(614,'41','41206','COLOMBIA','CSJ'),(615,'41','41244','ELÍAS','CSJ'),(616,'41','41298','GARZÓN','CSJ'),(617,'41','41306','GIGANTE','CSJ'),(618,'41','41319','GUADALUPE','CSJ'),(619,'41','41349','HOBO','CSJ'),(620,'41','41357','ÍQUIRA','CSJ'),(621,'41','41359','ISNOS','CSJ'),(622,'41','41378','LA ARGENTINA','CSJ'),(623,'41','41396','LA PLATA','CSJ'),(624,'41','41483','NÁTAGA','CSJ'),(625,'41','41503','OPORAPA','CSJ'),(626,'41','41518','PAICOL','CSJ'),(627,'41','41524','PALERMO','CSJ'),(628,'41','41530','PALESTINA','CSJ'),(629,'41','41548','PITAL','CSJ'),(630,'41','41551','PITALITO','CSJ'),(631,'41','41615','RIVERA','CSJ'),(632,'41','41660','SALADOBLANCO','CSJ'),(633,'41','41668','SAN AGUSTÍN','CSJ'),(634,'41','41676','SANTA MARÍA','CSJ'),(635,'41','41770','SUAZA','CSJ'),(636,'41','41791','TARQUI','CSJ'),(637,'41','41797','TESALIA','CSJ'),(638,'41','41799','TELLO','CSJ'),(639,'41','41801','TERUEL','CSJ'),(640,'41','41807','TIMANÁ','CSJ'),(641,'41','41872','VILLAVIEJA','CSJ'),(642,'41','41885','YAGUARÁ','CSJ'),(643,'44','44001','RIO HACHA','CSJ'),(644,'44','44035','ALBANIA','CSJ'),(645,'44','44078','BARRANCAS','CSJ'),(646,'44','44090','DIBULLA','CSJ'),(647,'44','44098','DISTRACCIÓN','CSJ'),(648,'44','44110','EL MOLINO','CSJ'),(649,'44','44279','FONSECA','CSJ'),(650,'44','44378','HATONUEVO','CSJ'),(651,'44','44420','LA JAGUA DEL PILAR','CSJ'),(652,'44','44430','MAICAO','CSJ'),(653,'44','44560','MANAURE','CSJ'),(654,'44','44650','SAN JUAN DEL CESAR','CSJ'),(655,'44','44847','URIBIA','CSJ'),(656,'44','44855','URUMITA','CSJ'),(657,'44','44874','VILLANUEVA','CSJ'),(658,'47','47001','SANTA MARTA','CSJ'),(659,'47','47030','ALGARROBO','CSJ'),(660,'47','47053','ARACATACA','CSJ'),(661,'47','47058','ARIGUANÍ','CSJ'),(662,'47','47161','CERRO DE SAN ANTONIO','CSJ'),(663,'47','47170','CHIVOLO','CSJ'),(664,'47','47189','CIÉNAGA','CSJ'),(665,'47','47205','CONCORDIA','CSJ'),(666,'47','47245','EL BANCO','CSJ'),(667,'47','47258','EL PIÑÓN','CSJ'),(668,'47','47268','EL RETÉN','CSJ'),(669,'47','47288','FUNDACIÓN','CSJ'),(670,'47','47318','GUAMAL','CSJ'),(671,'47','47460','NUEVA GRANADA','CSJ'),(672,'47','47541','PEDRAZA','CSJ'),(673,'47','47545','PIJIÑO DEL CARMEN','CSJ'),(674,'47','47551','PIVIJAY','CSJ'),(675,'47','47555','PLATO','CSJ'),(676,'47','47570','PUEBLOVIEJO','CSJ'),(677,'47','47605','REMOLINO','CSJ'),(678,'47','47660','SABANAS DE SAN ÁNGEL','CSJ'),(679,'47','47675','SALAMINA','CSJ'),(680,'47','47692','SAN SEBASTIÁN DE BUENAVISTA','CSJ'),(681,'47','47703','SAN ZENÓN','CSJ'),(682,'47','47707','SANTA ANA','CSJ'),(683,'47','47720','SANTA BÁRBARA DE PINTO','CSJ'),(684,'47','47745','SITIONUEVO','CSJ'),(685,'47','47798','TENERIFE','CSJ'),(686,'47','47960','ZAPAYÁN','CSJ'),(687,'47','47980','ZONA BANANERA','CSJ'),(688,'50','50001','VILLAVICENCIO','CSJ'),(689,'50','50006','ACACÍAS','CSJ'),(690,'50','50110','BARRANCA DE UPÍA','CSJ'),(691,'50','50124','CABUYARO','CSJ'),(692,'50','50150','CASTILLA LA NUEVA','CSJ'),(693,'50','50223','CUBARRAL','CSJ'),(694,'50','50226','CUMARAL','CSJ'),(695,'50','50245','EL CALVARIO','CSJ'),(696,'50','50251','EL CASTILLO','CSJ'),(697,'50','50270','EL DORADO','CSJ'),(698,'50','50287','FUENTE DE ORO','CSJ'),(699,'50','50313','GRANADA','CSJ'),(700,'50','50318','GUAMAL','CSJ'),(701,'50','50325','MAPIRIPÁN','CSJ'),(702,'50','50330','MESETAS','CSJ'),(703,'50','50350','LA MACARENA','CSJ'),(704,'50','50370','URIBE','CSJ'),(705,'50','50400','LEJANÍAS','CSJ'),(706,'50','50450','PUERTO CONCORDIA','CSJ'),(707,'50','50568','PUERTO GAITÁN','CSJ'),(708,'50','50573','PUERTO LÓPEZ','CSJ'),(709,'50','50577','PUERTO LLERAS','CSJ'),(710,'50','50590','PUERTO RICO','CSJ'),(711,'50','50606','RESTREPO','CSJ'),(712,'50','50680','SAN CARLOS DE GUAROA','CSJ'),(713,'50','50683','SAN JUAN DE ARAMA','CSJ'),(714,'50','50686','SAN JUANITO','CSJ'),(715,'50','50689','SAN MARTÍN','CSJ'),(716,'50','50711','VISTAHERMOSA','CSJ'),(717,'52','52001','PASTO','CSJ'),(718,'52','52019','ALBÁN','CSJ'),(719,'52','52022','ALDANA','CSJ'),(720,'52','52036','ANCUYA','CSJ'),(721,'52','52051','ARBOLEDA','CSJ'),(722,'52','52079','BARBACOAS','CSJ'),(723,'52','52083','BELÉN','CSJ'),(724,'52','52110','BUESACO','CSJ'),(725,'52','52203','COLÓN','CSJ'),(726,'52','52207','CONSACÁ','CSJ'),(727,'52','52210','CONTADERO','CSJ'),(728,'52','52215','CÓRDOBA','CSJ'),(729,'52','52224','CUASPUD CARLOSAMA','CSJ'),(730,'52','52227','CUMBAL','CSJ'),(731,'52','52233','CUMBITARA','CSJ'),(732,'52','52240','CHACHAGÜÍ','CSJ'),(733,'52','52250','EL CHARCO','CSJ'),(734,'52','52254','EL PEÑOL','CSJ'),(735,'52','52256','EL ROSARIO','CSJ'),(736,'52','52258','EL TABLÓN DE GÓMEZ','CSJ'),(737,'52','52260','EL TAMBO','CSJ'),(738,'52','52287','FUNES','CSJ'),(739,'52','52317','GUACHUCAL','CSJ'),(740,'52','52320','GUAITARILLA','CSJ'),(741,'52','52323','GUALMATÁN','CSJ'),(742,'52','52352','ILES','CSJ'),(743,'52','52354','IMUÉS','CSJ'),(744,'52','52356','IPIALES','CSJ'),(745,'52','52378','LA CRUZ','CSJ'),(746,'52','52381','LA FLORIDA','CSJ'),(747,'52','52385','LA LLANADA','CSJ'),(748,'52','52390','LA TOLA','CSJ'),(749,'52','52399','LA UNIÓN','CSJ'),(750,'52','52405','LEIVA','CSJ'),(751,'52','52411','LINARES','CSJ'),(752,'52','52418','LOS ANDES','CSJ'),(753,'52','52427','MAGÜÍ','CSJ'),(754,'52','52435','MALLAMA','CSJ'),(755,'52','52473','MOSQUERA','CSJ'),(756,'52','52480','NARIÑO','CSJ'),(757,'52','52490','OLAYA HERRERA','CSJ'),(758,'52','52506','OSPINA','CSJ'),(759,'52','52520','FRANCISCO PIZARRO','CSJ'),(760,'52','52540','POLICARPA','CSJ'),(761,'52','52560','POTOSÍ','CSJ'),(762,'52','52565','PROVIDENCIA','CSJ'),(763,'52','52573','PUERRES','CSJ'),(764,'52','52585','PUPIALES','CSJ'),(765,'52','52612','RICAURTE','CSJ'),(766,'52','52621','ROBERTO PAYÁN','CSJ'),(767,'52','52678','SAMANIEGO','CSJ'),(768,'52','52683','SANDONÁ','CSJ'),(769,'52','52685','SAN BERNARDO','CSJ'),(770,'52','52687','SAN LORENZO','CSJ'),(771,'52','52693','SAN PABLO','CSJ'),(772,'52','52694','SAN PEDRO DE CARTAGO','CSJ'),(773,'52','52696','SANTA BÁRBARA','CSJ'),(774,'52','52699','SANTACRUZ','CSJ'),(775,'52','52720','SAPUYES','CSJ'),(776,'52','52786','TAMINANGO','CSJ'),(777,'52','52788','TANGUA','CSJ'),(778,'52','52835','SAN ANDRÉS DE TUMACO','CSJ'),(779,'52','52838','TÚQUERRES','CSJ'),(780,'52','52885','YACUANQUER','CSJ'),(781,'54','54001','SAN JOSÉ DE CÚCUTA','CSJ'),(782,'54','54003','ÁBREGO','CSJ'),(783,'54','54051','ARBOLEDAS','CSJ'),(784,'54','54099','BOCHALEMA','CSJ'),(785,'54','54109','BUCARASICA','CSJ'),(786,'54','54125','CÁCOTA','CSJ'),(787,'54','54128','CÁCHIRA','CSJ'),(788,'54','54172','CHINÁCOTA','CSJ'),(789,'54','54174','CHITAGÁ','CSJ'),(790,'54','54206','CONVENCIÓN','CSJ'),(791,'54','54223','CUCUTILLA','CSJ'),(792,'54','54239','DURANIA','CSJ'),(793,'54','54245','EL CARMEN','CSJ'),(794,'54','54250','EL TARRA','CSJ'),(795,'54','54261','EL ZULIA','CSJ'),(796,'54','54313','GRAMALOTE','CSJ'),(797,'54','54344','HACARÍ','CSJ'),(798,'54','54347','HERRÁN','CSJ'),(799,'54','54377','LABATECA','CSJ'),(800,'54','54385','LA ESPERANZA','CSJ'),(801,'54','54398','LA PLAYA','CSJ'),(802,'54','54405','LOS PATIOS','CSJ'),(803,'54','54418','LOURDES','CSJ'),(804,'54','54480','MUTISCUA','CSJ'),(805,'54','54498','OCAÑA','CSJ'),(806,'54','54518','PAMPLONA','CSJ'),(807,'54','54520','PAMPLONITA','CSJ'),(808,'54','54553','PUERTO SANTANDER','CSJ'),(809,'54','54599','RAGONVALIA','CSJ'),(810,'54','54660','SALAZAR','CSJ'),(811,'54','54670','SAN CALIXTO','CSJ'),(812,'54','54673','SAN CAYETANO','CSJ'),(813,'54','54680','SANTIAGO','CSJ'),(814,'54','54720','SARDINATA','CSJ'),(815,'54','54743','SILOS','CSJ'),(816,'54','54800','TEORAMA','CSJ'),(817,'54','54810','TIBÚ','CSJ'),(818,'54','54820','TOLEDO','CSJ'),(819,'54','54871','VILLA CARO','CSJ'),(820,'54','54874','VILLA DEL ROSARIO','CSJ'),(821,'63','63001','ARMENIA','CSJ'),(822,'63','63111','BUENAVISTA','CSJ'),(823,'63','63130','CALARCÁ','CSJ'),(824,'63','63190','CIRCASIA','CSJ'),(825,'63','63212','CÓRDOBA','CSJ'),(826,'63','63272','FILANDIA','CSJ'),(827,'63','63302','GÉNOVA','CSJ'),(828,'63','63401','LA TEBAIDA','CSJ'),(829,'63','63470','MONTENEGRO','CSJ'),(830,'63','63548','PIJAO','CSJ'),(831,'63','63594','QUIMBAYA','CSJ'),(832,'63','63690','SALENTO','CSJ'),(833,'66','66001','PEREIRA','CSJ'),(834,'66','66045','APÍA','CSJ'),(835,'66','66075','BALBOA','CSJ'),(836,'66','66088','BELÉN DE UMBRÍA','CSJ'),(837,'66','66170','DOSQUEBRADAS','CSJ'),(838,'66','66318','GUÁTICA','CSJ'),(839,'66','66383','LA CELIA','CSJ'),(840,'66','66400','LA VIRGINIA','CSJ'),(841,'66','66440','MARSELLA','CSJ'),(842,'66','66456','MISTRATÓ','CSJ'),(843,'66','66572','PUEBLO RICO','CSJ'),(844,'66','66594','QUINCHÍA','CSJ'),(845,'66','66682','SANTA ROSA DE CABAL','CSJ'),(846,'66','66687','SANTUARIO','CSJ'),(847,'68','68001','BUCARAMANGA','CSJ'),(848,'68','68013','AGUADA','CSJ'),(849,'68','68020','ALBANIA','CSJ'),(850,'68','68051','ARATOCA','CSJ'),(851,'68','68077','BARBOSA','CSJ'),(852,'68','68079','BARICHARA','CSJ'),(853,'68','68081','BARRANCABERMEJA','CSJ'),(854,'68','68092','BETULIA','CSJ'),(855,'68','68101','BOLÍVAR','CSJ'),(856,'68','68121','CABRERA','CSJ'),(857,'68','68132','CALIFORNIA','CSJ'),(858,'68','68147','CAPITANEJO','CSJ'),(859,'68','68152','CARCASÍ','CSJ'),(860,'68','68160','CEPITÁ','CSJ'),(861,'68','68162','CERRITO','CSJ'),(862,'68','68167','CHARALÁ','CSJ'),(863,'68','68169','CHARTA','CSJ'),(864,'68','68176','CHIMA','CSJ'),(865,'68','68179','CHIPATÁ','CSJ'),(866,'68','68190','CIMITARRA','CSJ'),(867,'68','68207','CONCEPCIÓN','CSJ'),(868,'68','68209','CONFINES','CSJ'),(869,'68','68211','CONTRATACIÓN','CSJ'),(870,'68','68217','COROMORO','CSJ'),(871,'68','68229','CURITÍ','CSJ'),(872,'68','68235','EL CARMEN DE CHUCURÍ','CSJ'),(873,'68','68245','EL GUACAMAYO','CSJ'),(874,'68','68250','EL PEÑÓN','CSJ'),(875,'68','68255','EL PLAYÓN','CSJ'),(876,'68','68264','ENCINO','CSJ'),(877,'68','68266','ENCISO','CSJ'),(878,'68','68271','FLORIÁN','CSJ'),(879,'68','68276','FLORIDABLANCA','CSJ'),(880,'68','68296','GALÁN','CSJ'),(881,'68','68298','GÁMBITA','CSJ'),(882,'68','68307','GIRÓN','CSJ'),(883,'68','68318','GUACA','CSJ'),(884,'68','68320','GUADALUPE','CSJ'),(885,'68','68322','GUAPOTÁ','CSJ'),(886,'68','68324','GUAVATÁ','CSJ'),(887,'68','68327','GÜEPSA','CSJ'),(888,'68','68344','HATO','CSJ'),(889,'68','68368','JESÚS MARÍA','CSJ'),(890,'68','68370','JORDÁN','CSJ'),(891,'68','68377','LA BELLEZA','CSJ'),(892,'68','68385','LANDÁZURI','CSJ'),(893,'68','68397','LA PAZ','CSJ'),(894,'68','68406','LEBRIJA','CSJ'),(895,'68','68418','LOS SANTOS','CSJ'),(896,'68','68425','MACARAVITA','CSJ'),(897,'68','68432','MÁLAGA','CSJ'),(898,'68','68444','MATANZA','CSJ'),(899,'68','68464','MOGOTES','CSJ'),(900,'68','68468','MOLAGAVITA','CSJ'),(901,'68','68498','OCAMONTE','CSJ'),(902,'68','68500','OIBA','CSJ'),(903,'68','68502','ONZAGA','CSJ'),(904,'68','68522','PALMAR','CSJ'),(905,'68','68524','PALMAS DEL SOCORRO','CSJ'),(906,'68','68533','PÁRAMO','CSJ'),(907,'68','68547','PIEDECUESTA','CSJ'),(908,'68','68549','PINCHOTE','CSJ'),(909,'68','68572','PUENTE NACIONAL','CSJ'),(910,'68','68573','PUERTO PARRA','CSJ'),(911,'68','68575','PUERTO WILCHES','CSJ'),(912,'68','68615','RIONEGRO','CSJ'),(913,'68','68655','SABANA DE TORRES','CSJ'),(914,'68','68669','SAN ANDRÉS','CSJ'),(915,'68','68673','SAN BENITO','CSJ'),(916,'68','68679','SAN GIL','CSJ'),(917,'68','68682','SAN JOAQUÍN','CSJ'),(918,'68','68684','SAN JOSÉ DE MIRANDA','CSJ'),(919,'68','68686','SAN MIGUEL','CSJ'),(920,'68','68689','SAN VICENTE DE CHUCURÍ','CSJ'),(921,'68','68705','SANTA BÁRBARA','CSJ'),(922,'68','68720','SANTA HELENA DEL OPÓN','CSJ'),(923,'68','68745','SIMACOTA','CSJ'),(924,'68','68755','SOCORRO','CSJ'),(925,'68','68770','SUAITA','CSJ'),(926,'68','68773','SUCRE','CSJ'),(927,'68','68780','SURATÁ','CSJ'),(928,'68','68820','TONA','CSJ'),(929,'68','68855','VALLE DE SAN JOSÉ','CSJ'),(930,'68','68861','VÉLEZ','CSJ'),(931,'68','68867','VETAS','CSJ'),(932,'68','68872','VILLANUEVA','CSJ'),(933,'68','68895','ZAPATOCA','CSJ'),(934,'70','70001','SINCELEJO','CSJ'),(935,'70','70110','BUENAVISTA','CSJ'),(936,'70','70124','CAIMITO','CSJ'),(937,'70','70204','COLOSÓ','CSJ'),(938,'70','70215','COROZAL','CSJ'),(939,'70','70221','COVEÑAS','CSJ'),(940,'70','70230','CHALÁN','CSJ'),(941,'70','70233','EL ROBLE','CSJ'),(942,'70','70235','GALERAS','CSJ'),(943,'70','70265','GUARANDA','CSJ'),(944,'70','70400','LA UNIÓN','CSJ'),(945,'70','70418','LOS PALMITOS','CSJ'),(946,'70','70429','MAJAGUAL','CSJ'),(947,'70','70473','MORROA','CSJ'),(948,'70','70508','OVEJAS','CSJ'),(949,'70','70523','PALMITO','CSJ'),(950,'70','70670','SAMPUÉS','CSJ'),(951,'70','70678','SAN BENITO ABAD','CSJ'),(952,'70','70702','SAN JUAN DE BETULIA','CSJ'),(953,'70','70708','SAN MARCOS','CSJ'),(954,'70','70713','SAN ONOFRE','CSJ'),(955,'70','70717','SAN PEDRO','CSJ'),(956,'70','70742','SAN LUIS DE SINCÉ','CSJ'),(957,'70','70771','SUCRE','CSJ'),(958,'70','70820','SANTIAGO DE TOLÚ','CSJ'),(959,'70','70823','SAN JOSÉ DE TOLUVIEJO','CSJ'),(960,'73','73001','IBAGUÉ','CSJ'),(961,'73','73024','ALPUJARRA','CSJ'),(962,'73','73026','ALVARADO','CSJ'),(963,'73','73030','AMBALEMA','CSJ'),(964,'73','73043','ANZOÁTEGUI','CSJ'),(965,'73','73055','ARMERO','CSJ'),(966,'73','73067','ATACO','CSJ'),(967,'73','73124','CAJAMARCA','CSJ'),(968,'73','73148','CARMEN DE APICALÁ','CSJ'),(969,'73','73152','CASABIANCA','CSJ'),(970,'73','73168','CHAPARRAL','CSJ'),(971,'73','73200','COELLO','CSJ'),(972,'73','73217','COYAIMA','CSJ'),(973,'73','73226','CUNDAY','CSJ'),(974,'73','73236','DOLORES','CSJ'),(975,'73','73268','ESPINAL','CSJ'),(976,'73','73270','FALAN','CSJ'),(977,'73','73275','FLANDES','CSJ'),(978,'73','73283','FRESNO','CSJ'),(979,'73','73319','GUAMO','CSJ'),(980,'73','73347','HERVEO','CSJ'),(981,'73','73349','HONDA','CSJ'),(982,'73','73352','ICONONZO','CSJ'),(983,'73','73408','LÉRIDA','CSJ'),(984,'73','73411','LÍBANO','CSJ'),(985,'73','73443','SAN SEBASTIÁN DE MARIQUITA','CSJ'),(986,'73','73449','MELGAR','CSJ'),(987,'73','73461','MURILLO','CSJ'),(988,'73','73483','NATAGAIMA','CSJ'),(989,'73','73504','ORTEGA','CSJ'),(990,'73','73520','PALOCABILDO','CSJ'),(991,'73','73547','PIEDRAS','CSJ'),(992,'73','73555','PLANADAS','CSJ'),(993,'73','73563','PRADO','CSJ'),(994,'73','73585','PURIFICACIÓN','CSJ'),(995,'73','73616','RIOBLANCO','CSJ'),(996,'73','73622','RONCESVALLES','CSJ'),(997,'73','73624','ROVIRA','CSJ'),(998,'73','73671','SALDAÑA','CSJ'),(999,'73','73675','SAN ANTONIO','CSJ'),(1000,'73','73678','SAN LUIS','CSJ'),(1001,'73','73686','SANTA ISABEL','CSJ'),(1002,'73','73770','SUÁREZ','CSJ'),(1003,'73','73854','VALLE DE SAN JUAN','CSJ'),(1004,'73','73861','VENADILLO','CSJ'),(1005,'73','73870','VILLAHERMOSA','CSJ'),(1006,'73','73873','VILLARRICA','CSJ'),(1007,'76','76001','SANTIAGO DE CALI','CSJ'),(1008,'76','76020','ALCALÁ','CSJ'),(1009,'76','76036','ANDALUCÍA','CSJ'),(1010,'76','76041','ANSERMANUEVO','CSJ'),(1011,'76','76054','ARGELIA','CSJ'),(1012,'76','76100','BOLÍVAR','CSJ'),(1013,'76','76109','BUENAVENTURA','CSJ'),(1014,'76','76111','GUADALAJARA DE BUGA','CSJ'),(1015,'76','76113','BUGALAGRANDE','CSJ'),(1016,'76','76122','CAICEDONIA','CSJ'),(1017,'76','76126','CALIMA','CSJ'),(1018,'76','76130','CANDELARIA','CSJ'),(1019,'76','76147','CARTAGO','CSJ'),(1020,'76','76233','DAGUA','CSJ'),(1021,'76','76243','EL ÁGUILA','CSJ'),(1022,'76','76246','EL CAIRO','CSJ'),(1023,'76','76248','EL CERRITO','CSJ'),(1024,'76','76250','EL DOVIO','CSJ'),(1025,'76','76275','FLORIDA','CSJ'),(1026,'76','76306','GINEBRA','CSJ'),(1027,'76','76318','GUACARÍ','CSJ'),(1028,'76','76364','JAMUNDÍ','CSJ'),(1029,'76','76377','LA CUMBRE','CSJ'),(1030,'76','76400','LA UNIÓN','CSJ'),(1031,'76','76403','LA VICTORIA','CSJ'),(1032,'76','76497','OBANDO','CSJ'),(1033,'76','76520','PALMIRA','CSJ'),(1034,'76','76563','PRADERA','CSJ'),(1035,'76','76606','RESTREPO','CSJ'),(1036,'76','76616','RIOFRÍO','CSJ'),(1037,'76','76622','ROLDANILLO','CSJ'),(1038,'76','76670','SAN PEDRO','CSJ'),(1039,'76','76736','SEVILLA','CSJ'),(1040,'76','76823','TORO','CSJ'),(1041,'76','76828','TRUJILLO','CSJ'),(1042,'76','76834','TULUÁ','CSJ'),(1043,'76','76845','ULLOA','CSJ'),(1044,'76','76863','VERSALLES','CSJ'),(1045,'76','76869','VIJES','CSJ'),(1046,'76','76890','YOTOCO','CSJ'),(1047,'76','76892','YUMBO','CSJ'),(1048,'76','76895','ZARZAL','CSJ'),(1049,'81','81001','ARAUCA','CSJ'),(1050,'81','81065','ARAUQUITA','CSJ'),(1051,'81','81220','CRAVO NORTE','CSJ'),(1052,'81','81300','FORTUL','CSJ'),(1053,'81','81591','PUERTO RONDÓN','CSJ'),(1054,'81','81736','SARAVENA','CSJ'),(1055,'81','81794','TAME','CSJ'),(1056,'85','85001','YOPAL','CSJ'),(1057,'85','85010','AGUAZUL','CSJ'),(1058,'85','85015','CHÁMEZA','CSJ'),(1059,'85','85125','HATO COROZAL','CSJ'),(1060,'85','85136','LA SALINA','CSJ'),(1061,'85','85139','MANÍ','CSJ'),(1062,'85','85162','MONTERREY','CSJ'),(1063,'85','85225','NUNCHÍA','CSJ'),(1064,'85','85230','OROCUÉ','CSJ'),(1065,'85','85250','PAZ DE ARIPORO','CSJ'),(1066,'85','85263','PORE','CSJ'),(1067,'85','85279','RECETOR','CSJ'),(1068,'85','85300','SABANALARGA','CSJ'),(1069,'85','85315','SÁCAMA','CSJ'),(1070,'85','85325','SAN LUIS DE PALENQUE','CSJ'),(1071,'85','85400','TÁMARA','CSJ'),(1072,'85','85410','TAURAMENA','CSJ'),(1073,'85','85430','TRINIDAD','CSJ'),(1074,'85','85440','VILLANUEVA','CSJ'),(1075,'86','86001','MOCOA','CSJ'),(1076,'86','86219','COLÓN','CSJ'),(1077,'86','86320','ORITO','CSJ'),(1078,'86','86568','PUERTO ASÍS','CSJ'),(1079,'86','86569','PUERTO CAICEDO','CSJ'),(1080,'86','86571','PUERTO GUZMÁN','CSJ'),(1081,'86','86573','PUERTO LEGUÍZAMO','CSJ'),(1082,'86','86749','SIBUNDOY','CSJ'),(1083,'86','86755','SAN FRANCISCO','CSJ'),(1084,'86','86757','SAN MIGUEL','CSJ'),(1085,'86','86760','SANTIAGO','CSJ'),(1086,'86','86865','VALLE DEL GUAMUEZ','CSJ'),(1087,'86','86885','VILLAGARZÓN','CSJ'),(1088,'88','88001','SAN ANDRÉS','CSJ'),(1089,'88','88564','PROVIDENCIA','CSJ'),(1090,'91','91001','LETICIA','CSJ'),(1091,'91','91263','EL ENCANTO','CSJ'),(1092,'91','91405','LA CHORRERA','CSJ'),(1093,'91','91407','LA PEDRERA','CSJ'),(1094,'91','91430','LA VICTORIA','CSJ'),(1095,'91','91460','MIRITÍ - PARANÁ','CSJ'),(1096,'91','91530','PUERTO ALEGRÍA','CSJ'),(1097,'91','91536','PUERTO ARICA','CSJ'),(1098,'91','91540','PUERTO NARIÑO','CSJ'),(1099,'91','91669','PUERTO SANTANDER','CSJ'),(1100,'91','91798','TARAPACÁ','CSJ'),(1101,'94','94001','INÍRIDA','CSJ'),(1102,'94','94343','BARRANCOMINAS','CSJ'),(1103,'94','94883','SAN FELIPE','CSJ'),(1104,'94','94884','PUERTO COLOMBIA','CSJ'),(1105,'94','94885','LA GUADALUPE','CSJ'),(1106,'94','94886','CACAHUAL','CSJ'),(1107,'94','94887','PANA PANA','CSJ'),(1108,'94','94888','MORICHAL','CSJ'),(1109,'95','95001','SAN JOSÉ DEL GUAVIARE','CSJ'),(1110,'95','95015','CALAMAR','CSJ'),(1111,'95','95025','EL RETORNO','CSJ'),(1112,'95','95200','MIRAFLORES','CSJ'),(1113,'97','97001','MITÚ','CSJ'),(1114,'97','97161','CARURÚ','CSJ'),(1115,'97','97511','PACOA','CSJ'),(1116,'97','97666','TARAIRA','CSJ'),(1117,'97','97777','PAPUNAHUA','CSJ'),(1118,'97','97889','YAVARATÉ','CSJ'),(1119,'99','99001','PUERTO CARREÑO','CSJ'),(1120,'99','99524','LA PRIMAVERA','CSJ'),(1121,'99','99624','SANTA ROSALÍA','CSJ'),(1122,'99','99773','CUMARIBO','CSJ');
/*!40000 ALTER TABLE `municipios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones_usuarios`
--

DROP TABLE IF EXISTS `notificaciones_usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones_usuarios` (
  `id_notificaciones` varchar(36) NOT NULL,
  `incidente_id` int DEFAULT NULL,
  `triggered_by` varchar(20) DEFAULT NULL,
  `titulo` varchar(255) NOT NULL,
  `mensaje` text NOT NULL,
  `fue_leida` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_visualizacion` datetime DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ID_agencia` varchar(5) NOT NULL,
  `ID_usuario` varchar(20) NOT NULL,
  PRIMARY KEY (`id_notificaciones`),
  KEY `idx_incidente_id` (`incidente_id`),
  KEY `idx_triggered_by` (`triggered_by`),
  KEY `idx_usuario_agencia` (`ID_usuario`,`ID_agencia`),
  KEY `idx_is_read` (`fue_leida`),
  KEY `idx_fecha_creacion` (`fecha_creacion`),
  CONSTRAINT `notificaciones_usuarios_ibfk_1` FOREIGN KEY (`ID_usuario`, `ID_agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `notificaciones_usuarios_ibfk_2` FOREIGN KEY (`incidente_id`) REFERENCES `incidentes` (`ID_incidente`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones_usuarios`
--

LOCK TABLES `notificaciones_usuarios` WRITE;
/*!40000 ALTER TABLE `notificaciones_usuarios` DISABLE KEYS */;
INSERT INTO `notificaciones_usuarios` VALUES ('0226178f-4702-4233-9b8b-839dcb3677a3',NULL,'rbenavides','Municipios','No se pudieron cargar los municipios del departamento seleccionado.',1,'2026-06-06 22:22:29','2026-06-06 22:19:27','CSJ','rbenavides'),('052deb54-ad78-441a-9315-af359bf62d30',NULL,'rbenavides','Persona Registrada','Se ha guardado el nuevo registro.',1,'2026-06-06 21:55:40','2026-06-06 21:41:30','CSJ','rbenavides'),('0d29882f-bfd8-493a-a8dc-585f40cfb541',NULL,'rbenavides','Error','Field \'address\' doesn\'t have a default value',1,'2026-06-06 21:55:40','2026-06-06 21:40:02','CSJ','rbenavides'),('19034345-3935-44c9-9528-027de019c396',NULL,'rbenavides','Error','No hay eventos configurados para la agencia CSJ',1,'2026-06-06 21:55:40','2026-06-06 21:45:35','CSJ','rbenavides'),('1f30c699-794b-48e5-8265-bd2a82d5b549',NULL,'rbenavides','No se puede guardar','Complete: Teléfono.',1,'2026-06-06 22:12:26','2026-06-06 22:00:49','CSJ','rbenavides'),('26b4ec69-2252-4ed2-9e61-b717d4e3e7d0',NULL,'rbenavides','Registro Eliminado','La persona ha sido removida del sistema.',1,'2026-06-06 21:55:40','2026-06-06 21:55:32','CSJ','rbenavides'),('2e07c168-b8b4-4832-9758-c3b7f4006e3d',NULL,'rbenavides','Error al guardar','Cannot add or update a child row: a foreign key constraint fails (`gestionincidentes`.`personas`, CONSTRAINT `FK_Personas_TipoDocumentos` FOREIGN KEY (`Tipo_documento`) REFERENCES `tipodocumentos` (`Tipo_documento`))',0,NULL,'2026-06-07 12:15:52','CSJ','rbenavides'),('39fb8e96-3a2d-45d0-9a36-f1bffcff1fa3',NULL,'rbenavides','Municipios','No se pudo cargar la lista de municipios.',1,'2026-06-06 22:12:26','2026-06-06 22:00:41','CSJ','rbenavides'),('42615461-c573-4a38-9c09-b265776129f0',NULL,'rbenavides','Error al guardar','Column \'ID_Origen\' cannot be null',1,'2026-06-07 12:12:13','2026-06-07 12:12:03','CSJ','rbenavides'),('492dd1b4-4a65-490b-bbbc-45045f026994',NULL,'rbenavides','Solicitud Enviada','Se envió un enlace de ubicación a 3026172447 por WhatsApp.',1,'2026-06-07 12:12:13','2026-06-07 11:30:11','CSJ','rbenavides'),('64fd6922-7734-4deb-8d95-ad4b04aaf9ba',NULL,'rbenavides','No se puede guardar','Complete: Tipo de evento, Origen, Ubicación en mapa (latitud), Ubicación en mapa (longitud).',1,'2026-06-07 12:12:13','2026-06-07 11:32:25','CSJ','rbenavides'),('6d8679c2-e620-4b38-9db0-4bf1d554b6b0',NULL,'rbenavides','Correo enviado','Notificación enviada a 1 destinatario(s).',1,'2026-06-06 21:55:40','2026-06-06 20:26:59','CSJ','rbenavides'),('78d46a15-44e5-4b06-9e99-4da22d16676b',NULL,'rbenavides','Persona Registrada','Se ha guardado el nuevo registro.',1,'2026-06-06 21:55:40','2026-06-06 21:49:36','CSJ','rbenavides'),('7a759e9c-4f83-4f25-8afc-9ea700022fcc',NULL,'rbenavides','Municipios','No se pudieron cargar los municipios del departamento seleccionado.',1,'2026-06-06 22:22:29','2026-06-06 22:19:18','CSJ','rbenavides'),('89d8b2e0-1da2-41c8-a674-2ddc0badbc61',NULL,'rbenavides','Solicitud Enviada','Se envió un enlace de ubicación a 3026172447 por WhatsApp.',1,'2026-06-07 12:12:13','2026-06-07 11:23:49','CSJ','rbenavides'),('8ad4044a-f7da-4cb8-a4ad-1072c8f15f93',NULL,'rbenavides','Error al guardar','Column \'ID_Origen\' cannot be null',0,NULL,'2026-06-07 12:12:33','CSJ','rbenavides'),('9326d739-4ac8-43db-865b-f38ae64c1d52',NULL,'rbenavides','No se puede guardar','Complete: Tipo de evento, Origen, Teléfono, Dirección del hecho, Departamento (Ubicación del Incidente), Municipio / ciudad (Ubicación del Incidente), Ubicación en mapa (latitud), Ubicación en mapa (longitud).',1,'2026-06-06 22:22:29','2026-06-06 22:22:24','CSJ','rbenavides'),('961e11a2-1d86-42d4-a3d3-37db3810f3a9',NULL,'rbenavides','Error','No hay eventos configurados para la agencia CSJ',1,'2026-06-06 21:55:40','2026-06-06 21:45:59','CSJ','rbenavides'),('a2a7264a-c3a6-4963-935f-d5ab9dfd6a56',NULL,'rbenavides','Error','Field \'address\' doesn\'t have a default value',1,'2026-06-06 21:55:40','2026-06-06 21:39:59','CSJ','rbenavides'),('a8b818c9-bb08-4e99-8c37-be1bde35a37a',NULL,'rbenavides','Persona Registrada','Se ha guardado el nuevo registro.',1,'2026-06-06 21:55:40','2026-06-06 21:54:18','CSJ','rbenavides'),('b733fbfb-c741-49fd-b985-55af1fe6ee8f',7,'rbenavides','Pestaña Abierta','Se abrió el incidente #INC-00000004-26.',1,'2026-06-06 22:12:26','2026-06-06 22:00:41','CSJ','rbenavides'),('c3e3ee1f-6a67-43ef-9512-6ab97dde084f',NULL,'rbenavides','Solicitud Enviada','Se envió un enlace de ubicación a 3026172447 por WhatsApp.',1,'2026-06-07 12:12:13','2026-06-07 11:31:17','CSJ','rbenavides'),('c8106e0b-1bbe-4687-b0e2-4c93f7fc6ec8',NULL,'rbenavides','Registro Eliminado','La persona ha sido removida del sistema.',1,'2026-06-06 22:00:17','2026-06-06 21:57:45','CSJ','rbenavides'),('cb7d97e9-3e48-454a-87df-af2c14c52fa3',NULL,'rbenavides','Persona Registrada','Se ha guardado el nuevo registro.',1,'2026-06-06 22:00:17','2026-06-06 21:58:12','CSJ','rbenavides');
/*!40000 ALTER TABLE `notificaciones_usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `origen`
--

DROP TABLE IF EXISTS `origen`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `origen` (
  `ID_Origen` int NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(50) NOT NULL,
  `Descripcion` varchar(150) DEFAULT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Origen`),
  UNIQUE KEY `UQ_Origen_Agencia` (`Nombre`,`ID_Agencia`),
  KEY `FK_Origen_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_Origen_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `origen`
--

LOCK TABLES `origen` WRITE;
/*!40000 ALTER TABLE `origen` DISABLE KEYS */;
INSERT INTO `origen` VALUES (1,'Llamada 123','Llamada de emergencia al 123','POL','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `origen` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `pasosprotocolo`
--

DROP TABLE IF EXISTS `pasosprotocolo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `pasosprotocolo` (
  `ID_Paso` int NOT NULL AUTO_INCREMENT,
  `ID_Protocolo` int NOT NULL,
  `NumeroPaso` int NOT NULL,
  `Descripcion` varchar(200) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Paso`),
  UNIQUE KEY `UQ_Protocolo_Paso` (`ID_Protocolo`,`NumeroPaso`),
  CONSTRAINT `FK_PasosProtocolo_Protocolos` FOREIGN KEY (`ID_Protocolo`) REFERENCES `protocolos` (`ID_Protocolo`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `pasosprotocolo`
--

LOCK TABLES `pasosprotocolo` WRITE;
/*!40000 ALTER TABLE `pasosprotocolo` DISABLE KEYS */;
INSERT INTO `pasosprotocolo` VALUES (1,1,1,'Verificar lesionados y neutralizar tirador','2026-05-29 10:06:43'),(2,1,2,'Acordonar el área','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `pasosprotocolo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permisos`
--

DROP TABLE IF EXISTS `permisos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos` (
  `ID_permiso` int NOT NULL AUTO_INCREMENT,
  `Nombre_permiso` varchar(50) NOT NULL,
  `Descripcion_permiso` varchar(100) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_permiso`),
  UNIQUE KEY `UQ_Permiso` (`Nombre_permiso`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permisos`
--

LOCK TABLES `permisos` WRITE;
/*!40000 ALTER TABLE `permisos` DISABLE KEYS */;
INSERT INTO `permisos` VALUES (1,'VER_INCIDENTES','Permiso para visualizar incidentes','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `permisos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permisos_de_rol`
--

DROP TABLE IF EXISTS `permisos_de_rol`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permisos_de_rol` (
  `id_permiso` int NOT NULL AUTO_INCREMENT,
  `id_rol` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `module_id` int NOT NULL,
  `enabled` tinyint(1) NOT NULL DEFAULT '0',
  `can_view` tinyint(1) NOT NULL DEFAULT '0',
  `can_create` tinyint(1) NOT NULL DEFAULT '0',
  `can_edit` tinyint(1) NOT NULL DEFAULT '0',
  `can_delete` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_permiso`),
  KEY `idx_rol` (`id_rol`),
  KEY `idx_agencia` (`ID_Agencia`),
  KEY `idx_module` (`module_id`),
  KEY `idx_rol_agencia` (`id_rol`,`ID_Agencia`),
  KEY `idx_enabled` (`enabled`),
  CONSTRAINT `fk_permiso_agencia` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_permiso_module` FOREIGN KEY (`module_id`) REFERENCES `modules` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_permiso_rol` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`ID_Rol`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=73 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permisos_de_rol`
--

LOCK TABLES `permisos_de_rol` WRITE;
/*!40000 ALTER TABLE `permisos_de_rol` DISABLE KEYS */;
INSERT INTO `permisos_de_rol` VALUES (1,'RP-1','csj',1,1,1,1,1,1),(2,'RP-1','csj',2,1,1,1,1,1),(3,'RP-1','csj',3,1,1,1,1,1),(4,'RP-1','csj',4,1,1,1,1,1),(5,'RP-2','csj',1,1,1,1,1,0),(6,'RP-2','csj',2,1,1,1,1,0),(7,'RP-2','csj',3,1,1,0,0,0),(8,'RP-2','csj',4,0,0,0,0,0),(9,'RP-3','csj',1,1,1,0,0,0),(10,'RP-3','csj',2,1,1,1,1,0),(11,'RP-3','csj',3,0,0,0,0,0),(12,'RP-3','csj',4,0,0,0,0,0),(13,'RP-4','csj',1,1,1,0,0,0),(14,'RP-4','csj',2,1,1,0,1,0),(15,'RP-4','csj',3,0,0,0,0,0),(16,'RP-4','csj',4,0,0,0,0,0),(17,'RP-5','csj',1,1,1,0,0,0),(18,'RP-5','csj',2,1,1,0,0,0),(19,'RP-5','csj',3,1,1,0,0,0),(20,'RP-5','csj',4,0,0,0,0,0),(21,'RP-6','csj',1,1,1,0,0,0),(22,'RP-6','csj',2,1,1,0,0,0),(23,'RP-6','csj',3,1,1,0,0,0),(24,'RP-6','csj',4,0,0,0,0,0),(49,'RP-8','pol',1,1,1,1,1,1),(50,'RP-8','pol',2,1,1,1,1,1),(51,'RP-8','pol',3,1,1,1,1,1),(52,'RP-8','pol',4,1,1,1,1,1),(53,'RP-9','pol',1,1,1,1,1,0),(54,'RP-9','pol',2,1,1,1,1,0),(55,'RP-9','pol',3,1,1,0,0,0),(56,'RP-9','pol',4,0,0,0,0,0),(57,'RP-10','pol',1,1,1,0,0,0),(58,'RP-10','pol',2,1,1,1,1,0),(59,'RP-10','pol',3,0,0,0,0,0),(60,'RP-10','pol',4,0,0,0,0,0),(61,'RP-11','pol',1,1,1,0,0,0),(62,'RP-11','pol',2,1,1,0,1,0),(63,'RP-11','pol',3,0,0,0,0,0),(64,'RP-11','pol',4,0,0,0,0,0),(65,'RP-12','pol',1,1,1,0,0,0),(66,'RP-12','pol',2,1,1,0,0,0),(67,'RP-12','pol',3,1,1,0,0,0),(68,'RP-12','pol',4,0,0,0,0,0),(69,'RP-13','pol',1,1,1,0,0,0),(70,'RP-13','pol',2,1,1,0,0,0),(71,'RP-13','pol',3,1,1,0,0,0),(72,'RP-13','pol',4,0,0,0,0,0);
/*!40000 ALTER TABLE `permisos_de_rol` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `personas`
--

DROP TABLE IF EXISTS `personas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `personas` (
  `ID_persona` int NOT NULL AUTO_INCREMENT,
  `Primer_Nombre` varchar(50) NOT NULL,
  `Segundo_Nombre` varchar(50) DEFAULT NULL,
  `Primer_Apellido` varchar(50) NOT NULL,
  `Segundo_Apellido` varchar(50) DEFAULT NULL,
  `ID_RolP` int NOT NULL,
  `Contacto` varchar(100) DEFAULT NULL,
  `Tipo_documento` varchar(20) DEFAULT NULL,
  `Numero_documento` varchar(30) DEFAULT NULL,
  `Comentarios` varchar(200) DEFAULT NULL,
  `ID_incidente` int DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ID_Agencia` varchar(5) DEFAULT NULL,
  `ID_Usuario` varchar(20) DEFAULT NULL,
  `ID_genero` int DEFAULT NULL,
  PRIMARY KEY (`ID_persona`),
  KEY `FK_Personas_Rolpersonas` (`ID_RolP`),
  KEY `FK_Personas_TipoDocumentos` (`Tipo_documento`),
  KEY `fk_registro_ID_agencia` (`ID_Usuario`,`ID_Agencia`),
  KEY `fk_registro_personas_incidente` (`ID_incidente`),
  KEY `idx_genero` (`ID_genero`),
  CONSTRAINT `fk_persona_genero` FOREIGN KEY (`ID_genero`) REFERENCES `genero` (`ID_genero`),
  CONSTRAINT `FK_Personas_Rolpersonas` FOREIGN KEY (`ID_RolP`) REFERENCES `rolpersonas` (`ID_RolP`),
  CONSTRAINT `FK_Personas_TipoDocumentos` FOREIGN KEY (`Tipo_documento`) REFERENCES `tipodocumentos` (`Tipo_documento`),
  CONSTRAINT `fk_registro_ID_agencia` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `fk_registro_personas_incidente` FOREIGN KEY (`ID_incidente`) REFERENCES `incidentes` (`ID_incidente`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `personas`
--

LOCK TABLES `personas` WRITE;
/*!40000 ALTER TABLE `personas` DISABLE KEYS */;
INSERT INTO `personas` VALUES (5,'Ana',NULL,'Rodriguez',NULL,2,NULL,'CC','1102976487',NULL,NULL,'2026-06-06 21:58:12','CSJ','rbenavides',1);
/*!40000 ALTER TABLE `personas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `prioridades`
--

DROP TABLE IF EXISTS `prioridades`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `prioridades` (
  `ID_prioridad` int NOT NULL AUTO_INCREMENT,
  `Prioridad` varchar(50) NOT NULL,
  `Descripcion` varchar(150) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_prioridad`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `prioridades`
--

LOCK TABLES `prioridades` WRITE;
/*!40000 ALTER TABLE `prioridades` DISABLE KEYS */;
INSERT INTO `prioridades` VALUES (1,'Alta','Requiere atención inmediata - responder en menos de 15 minutos','2026-05-29 10:06:43'),(2,'Media','Puede esperar breve tiempo - responder en menos de 1 hora','2026-05-29 10:06:43'),(3,'Baja','No es urgente - responder en menos de 24 horas','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `prioridades` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `protocolos`
--

DROP TABLE IF EXISTS `protocolos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `protocolos` (
  `ID_Protocolo` int NOT NULL AUTO_INCREMENT,
  `Protocolo` varchar(50) NOT NULL,
  `ID_evento` int NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `Descripcion` varchar(200) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Protocolo`),
  UNIQUE KEY `UQ_Protocolo_Agencia` (`Protocolo`,`ID_Agencia`),
  KEY `FK_Protocolos_Agencias` (`ID_Agencia`),
  KEY `FK_Protocolos_Eventos` (`ID_evento`),
  CONSTRAINT `FK_Protocolos_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`),
  CONSTRAINT `FK_Protocolos_Eventos` FOREIGN KEY (`ID_evento`) REFERENCES `eventos` (`ID_evento`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `protocolos`
--

LOCK TABLES `protocolos` WRITE;
/*!40000 ALTER TABLE `protocolos` DISABLE KEYS */;
INSERT INTO `protocolos` VALUES (1,'PROT_911',1,'POL','Protocolo para atención de disparon','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `protocolos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registro_logueos`
--

DROP TABLE IF EXISTS `registro_logueos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registro_logueos` (
  `ID_registro` int NOT NULL AUTO_INCREMENT,
  `Accion` varchar(50) NOT NULL,
  `Descripcion_accion` varchar(200) DEFAULT NULL,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `ID_Rol` varchar(20) NOT NULL,
  `IDAgencias` varchar(5) NOT NULL,
  `Recordar_usuario` enum('Si','No') NOT NULL DEFAULT 'No',
  `Fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Login_exitoso` enum('Exitoso','Fallido','Pendiente') NOT NULL DEFAULT 'Pendiente',
  PRIMARY KEY (`ID_registro`),
  KEY `idx_usuario` (`ID_Usuario`),
  KEY `idx_fecha` (`Fecha`),
  KEY `idx_login_exitoso` (`Login_exitoso`),
  KEY `idx_accion` (`Accion`),
  KEY `idx_agencia` (`IDAgencias`),
  KEY `fk_registro_logueos_usuario` (`ID_Usuario`,`ID_Agencia`),
  KEY `registro_logueos_ibfk_2` (`ID_Rol`),
  CONSTRAINT `fk_registro_logueos_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `registro_logueos_ibfk_2` FOREIGN KEY (`ID_Rol`) REFERENCES `roles` (`ID_Rol`),
  CONSTRAINT `registro_logueos_ibfk_3` FOREIGN KEY (`IDAgencias`) REFERENCES `agencias` (`IDAgencias`) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registro_logueos`
--

LOCK TABLES `registro_logueos` WRITE;
/*!40000 ALTER TABLE `registro_logueos` DISABLE KEYS */;
/*!40000 ALTER TABLE `registro_logueos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registrodobleautentificacion`
--

DROP TABLE IF EXISTS `registrodobleautentificacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registrodobleautentificacion` (
  `ID_accion` int NOT NULL AUTO_INCREMENT,
  `accion` varchar(200) NOT NULL,
  `ID_Usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `IDAgencias` varchar(5) NOT NULL,
  `Fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Correo` varchar(100) NOT NULL,
  `ID_Registro` int NOT NULL,
  PRIMARY KEY (`ID_accion`),
  KEY `idx_usuario` (`ID_Usuario`),
  KEY `idx_agencia` (`IDAgencias`),
  KEY `idx_fecha` (`Fecha`),
  KEY `idx_correo` (`Correo`),
  KEY `idx_registro` (`ID_Registro`),
  KEY `fk_registro_2fa_usuario` (`ID_Usuario`,`ID_Agencia`),
  CONSTRAINT `fk_registro_2fa_usuario` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `registrodobleautentificacion_ibfk_2` FOREIGN KEY (`IDAgencias`) REFERENCES `agencias` (`IDAgencias`) ON DELETE RESTRICT,
  CONSTRAINT `registrodobleautentificacion_ibfk_3` FOREIGN KEY (`ID_Registro`) REFERENCES `registro_logueos` (`ID_registro`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registrodobleautentificacion`
--

LOCK TABLES `registrodobleautentificacion` WRITE;
/*!40000 ALTER TABLE `registrodobleautentificacion` DISABLE KEYS */;
/*!40000 ALTER TABLE `registrodobleautentificacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `riesgos`
--

DROP TABLE IF EXISTS `riesgos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `riesgos` (
  `ID_riesgo` int NOT NULL AUTO_INCREMENT,
  `Nombre_riesgo` varchar(50) NOT NULL,
  `Descripcion` varchar(100) DEFAULT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `Fecha_registro` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_riesgo`),
  UNIQUE KEY `unique_riesgo_por_agencia` (`ID_Agencia`,`Nombre_riesgo`),
  CONSTRAINT `riesgos_ibfk_1` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `riesgos`
--

LOCK TABLES `riesgos` WRITE;
/*!40000 ALTER TABLE `riesgos` DISABLE KEYS */;
INSERT INTO `riesgos` VALUES (1,'Ordinario','Riesgo de nivel ordinario según clasificación institucional','CSJ','2026-06-05 15:16:41'),(2,'Extraordinario','Riesgo de nivel extraordinario que requiere atención especial','CSJ','2026-06-05 15:16:41'),(3,'Ordinario','Riesgo de nivel ordinario según clasificación policial','POL','2026-06-05 15:16:41'),(4,'Extraordinario','Riesgo de nivel extraordinario que requiere intervención prioritaria','POL','2026-06-05 15:16:41');
/*!40000 ALTER TABLE `riesgos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `ID_Rol` varchar(20) NOT NULL,
  `Rol` varchar(50) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `Descripcion` varchar(100) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_Rol`),
  UNIQUE KEY `uq_rol_agencia` (`Rol`,`ID_Agencia`),
  KEY `FK_Roles_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_Roles_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('RP-1','Administrador del sistema','csj','Control total del sistema','2026-06-04 16:49:15'),('RP-10','Operador / Despachador','pol','Crea y actualiza incidentes','2026-06-04 16:49:15'),('RP-11','Unidad / Agente de campo','pol','Atiende y actualiza en terreno','2026-06-04 16:49:15'),('RP-12','Analista / Informes','pol','Consulta reportes e indicadores','2026-06-04 16:49:15'),('RP-13','Usuario Consulta','pol','Solo lectura','2026-06-04 16:49:15'),('RP-2','Supervisor / Coordinador','csj','Gestiona equipos y aprueba cambios','2026-06-04 16:49:15'),('RP-3','Operador / Despachador','csj','Crea y actualiza incidentes','2026-06-04 16:49:15'),('RP-4','Unidad / Agente de campo','csj','Atiende y actualiza en terreno','2026-06-04 16:49:15'),('RP-5','Analista / Informes','csj','Consulta reportes e indicadores','2026-06-04 16:49:15'),('RP-6','Usuario Consulta','csj','Solo lectura','2026-06-04 16:49:15'),('RP-8','Administrador del sistema','pol','Control total del sistema','2026-06-04 16:49:15'),('RP-9','Supervisor / Coordinador','pol','Gestiona equipos y aprueba cambios','2026-06-04 16:49:15');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles_lugar`
--

DROP TABLE IF EXISTS `roles_lugar`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles_lugar` (
  `ID_Rol_Lugar` int NOT NULL AUTO_INCREMENT,
  `Rol_lugar` varchar(50) NOT NULL,
  `Descripcion` varchar(100) DEFAULT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  PRIMARY KEY (`ID_Rol_Lugar`),
  UNIQUE KEY `uq_rol_lugar_agencia` (`Rol_lugar`,`ID_Agencia`),
  KEY `fk_rol_lugar_agencia` (`ID_Agencia`),
  CONSTRAINT `fk_rol_lugar_agencia` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles_lugar`
--

LOCK TABLES `roles_lugar` WRITE;
/*!40000 ALTER TABLE `roles_lugar` DISABLE KEYS */;
INSERT INTO `roles_lugar` VALUES (1,'Vivienda_Particular','Casa o apartamento de una persona natural','CSJ'),(2,'Casa_Magistrado','Residencia particular de un magistrado','CSJ'),(3,'Hotel','Establecimiento de hospedaje','CSJ'),(4,'Oficina_Privada','Oficina de empresa privada','CSJ'),(5,'Via_Publica','Calle, carrera, avenida o vía pública','CSJ'),(6,'Sede_Judicial','Palacio de justicia, juzgado o tribunal','CSJ'),(7,'Vehiculo_Particular','Automóvil particular como lugar del incidente','CSJ'),(8,'Restaurante','Establecimiento de comidas','CSJ'),(9,'Centro_Comercial','Centro comercial','CSJ'),(10,'Banco','Entidad financiera','CSJ');
/*!40000 ALTER TABLE `roles_lugar` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rolesvehiculo`
--

DROP TABLE IF EXISTS `rolesvehiculo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rolesvehiculo` (
  `ID_RolVehiculo` int NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(50) NOT NULL,
  `Descripcion` varchar(100) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_RolVehiculo`),
  UNIQUE KEY `UQ_RolVehiculo_Agencia` (`Nombre`,`ID_Agencia`),
  KEY `FK_RolesVehiculo_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_RolesVehiculo_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rolesvehiculo`
--

LOCK TABLES `rolesvehiculo` WRITE;
/*!40000 ALTER TABLE `rolesvehiculo` DISABLE KEYS */;
INSERT INTO `rolesvehiculo` VALUES (1,'Implicado','Vehículo involucrado en el incidente','POL','2026-05-29 10:06:43'),(2,'Afectado','Vehículo con daños','POL','2026-05-29 10:06:43'),(3,'Testigo','Vehículo que presencia el incidente','POL','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `rolesvehiculo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rolpersonas`
--

DROP TABLE IF EXISTS `rolpersonas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `rolpersonas` (
  `ID_RolP` int NOT NULL AUTO_INCREMENT,
  `Nombre` varchar(50) NOT NULL,
  `Descripcion` varchar(100) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_RolP`),
  UNIQUE KEY `UQ_ID_RolP_Agencia` (`Nombre`,`ID_Agencia`),
  KEY `FK_rolpersonas_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_rolpersonas_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rolpersonas`
--

LOCK TABLES `rolpersonas` WRITE;
/*!40000 ALTER TABLE `rolpersonas` DISABLE KEYS */;
INSERT INTO `rolpersonas` VALUES (1,'Ordinario','Rol ordinario para personas según clasificación institucional','CSJ','2026-06-05 12:22:05'),(2,'Extraordinario','Rol extraordinario que requiere atención especial','CSJ','2026-06-05 12:22:05'),(3,'Ordinario','Rol ordinario para personas según clasificación institucional','POL','2026-06-05 12:23:10'),(4,'Extraordinario','Rol extraordinario que requiere atención especial','POL','2026-06-05 12:23:10');
/*!40000 ALTER TABLE `rolpersonas` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipodocumentos`
--

DROP TABLE IF EXISTS `tipodocumentos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipodocumentos` (
  `Tipo_documento` varchar(20) NOT NULL,
  `Descripcion` varchar(100) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`Tipo_documento`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipodocumentos`
--

LOCK TABLES `tipodocumentos` WRITE;
/*!40000 ALTER TABLE `tipodocumentos` DISABLE KEYS */;
INSERT INTO `tipodocumentos` VALUES ('CC','Cédula de ciudadanía','2026-05-29 10:06:43'),('CE','Cédula de extranjería','2026-05-29 10:06:43'),('NIT','Número de identificación tributaria','2026-05-29 10:06:43'),('PA','Pasaporte','2026-05-29 10:06:43'),('TI','Tarjeta de identidad','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `tipodocumentos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tipovehiculo`
--

DROP TABLE IF EXISTS `tipovehiculo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tipovehiculo` (
  `ID_TipoVehi` int NOT NULL AUTO_INCREMENT,
  `Tipo_vehiculo` varchar(50) NOT NULL,
  `Descripcion` varchar(100) DEFAULT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`ID_TipoVehi`),
  UNIQUE KEY `UQ_TipoVehiculo_Agencia` (`Tipo_vehiculo`,`ID_Agencia`),
  KEY `FK_TipoVehiculo_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_TipoVehiculo_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tipovehiculo`
--

LOCK TABLES `tipovehiculo` WRITE;
/*!40000 ALTER TABLE `tipovehiculo` DISABLE KEYS */;
INSERT INTO `tipovehiculo` VALUES (1,'Automóvil','Vehículo particular de 4 ruedas','POL','2026-05-29 10:06:43'),(2,'Motocicleta','Motocicleta o ciclomotor de 2 ruedas','POL','2026-05-29 10:06:43'),(3,'Camión','Vehículo de carga pesada','POL','2026-05-29 10:06:43'),(4,'Bicicleta','Vehículo de tracción humana','POL','2026-05-29 10:06:43'),(5,'Bus','Transporte público de pasajeros','POL','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `tipovehiculo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ubicacion`
--

DROP TABLE IF EXISTS `ubicacion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ubicacion` (
  `ID_solicitud` int NOT NULL AUTO_INCREMENT,
  `FechaHora_envio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Numero_ubicacion` varchar(20) NOT NULL,
  `Canal` varchar(20) NOT NULL,
  `ID_incidente` int DEFAULT NULL,
  `url_peticion` varchar(500) NOT NULL,
  `ID_usuario` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `direccion` varchar(100) DEFAULT NULL,
  `lat` double DEFAULT NULL,
  `long` double DEFAULT NULL,
  `FechaHora_recibido` datetime DEFAULT NULL,
  PRIMARY KEY (`ID_solicitud`),
  KEY `FK_Ubicacion_Incidentes` (`ID_incidente`),
  KEY `fk_ubicacion_usuario` (`ID_usuario`,`ID_Agencia`),
  CONSTRAINT `FK_Ubicacion_Incidentes` FOREIGN KEY (`ID_incidente`) REFERENCES `incidentes` (`ID_incidente`),
  CONSTRAINT `fk_ubicacion_usuario` FOREIGN KEY (`ID_usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `ubicacion_chk_1` CHECK ((`Canal` in (_utf8mb4'Whatsapp',_utf8mb4'SMS')))
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ubicacion`
--

LOCK TABLES `ubicacion` WRITE;
/*!40000 ALTER TABLE `ubicacion` DISABLE KEYS */;
INSERT INTO `ubicacion` VALUES (2,'2026-06-07 11:23:49','3026172447','Whatsapp',NULL,'http://localhost:3000/location/share?request_id=1780849429398','rbenavides','CSJ',NULL,4.6223521,-74.1302512,'2026-06-07 11:24:25'),(3,'2026-06-07 11:30:11','3026172447','Whatsapp',NULL,'http://localhost:3000/location/share?request_id=1780849811364','rbenavides','CSJ',NULL,4.6223433,-74.1302501,'2026-06-07 11:30:33'),(4,'2026-06-07 11:31:17','3026172447','Whatsapp',NULL,'http://localhost:3000/location/share?request_id=1780849877105','rbenavides','CSJ',NULL,4.6223685,-74.1302895,'2026-06-07 11:31:35');
/*!40000 ALTER TABLE `ubicacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `ID_Usuario` varchar(20) NOT NULL,
  `Primer_Nombre` varchar(50) NOT NULL,
  `Segundo_Nombre` varchar(50) DEFAULT NULL,
  `Primer_Apellido` varchar(50) NOT NULL,
  `Segundo_Apellido` varchar(50) DEFAULT NULL,
  `ID_Rol` varchar(20) NOT NULL,
  `ID_Agencia` varchar(5) NOT NULL,
  `Correo` varchar(100) NOT NULL,
  `Telefono` varchar(20) DEFAULT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `Contraseña` varchar(100) NOT NULL,
  `estado` varchar(20) DEFAULT NULL,
  `Token_Contraseña` varchar(300) NOT NULL,
  PRIMARY KEY (`ID_Usuario`,`ID_Agencia`),
  UNIQUE KEY `uk_usuarios_correo_agencia` (`Correo`,`ID_Agencia`),
  KEY `FK_Usuarios_Roles` (`ID_Rol`),
  KEY `FK_Usuarios_Agencias` (`ID_Agencia`),
  CONSTRAINT `FK_Usuarios_Agencias` FOREIGN KEY (`ID_Agencia`) REFERENCES `agencias` (`IDAgencias`),
  CONSTRAINT `FK_Usuarios_Roles` FOREIGN KEY (`ID_Rol`) REFERENCES `roles` (`ID_Rol`),
  CONSTRAINT `chk_estado` CHECK ((`estado` in (_utf8mb4'Activo',_utf8mb4'Inactivo')))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES ('MCHAPARRO','miguel','david','chaparro','menco','RP-2','CSJ','rogeliomenco4@gmail.com','3026172447','2026-06-06 21:17:48','INGchaparro04#+','Activo','OK'),('rbenavides','Rogelio','Andrés','Menco','Benavides','RP-1','CSJ','rogelio.menco@itelca.com.co','3026172447','2026-05-29 10:06:43','INGbenavides04#+','Activo','');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `vehiculos`
--

DROP TABLE IF EXISTS `vehiculos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `vehiculos` (
  `ID_vehiculo` int NOT NULL AUTO_INCREMENT,
  `ID_RolV` int NOT NULL,
  `ID_TipoVehi` int NOT NULL,
  `Placa` varchar(20) DEFAULT NULL,
  `Color` varchar(30) DEFAULT NULL,
  `Marca` varchar(50) DEFAULT NULL,
  `Modelo_linea` varchar(50) DEFAULT NULL,
  `ID_incidente` int NOT NULL,
  `FechaRegistro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `ID_Agencia` varchar(5) DEFAULT NULL,
  `ID_Usuario` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`ID_vehiculo`),
  KEY `FK_Vehiculos_RolesVehiculo` (`ID_RolV`),
  KEY `FK_Vehiculos_TipoVehiculo` (`ID_TipoVehi`),
  KEY `fk_registro_ID_agencia_vehiculo` (`ID_Usuario`,`ID_Agencia`),
  KEY `fk_registro_vehiculos_incidente` (`ID_incidente`),
  CONSTRAINT `fk_registro_ID_agencia_vehiculo` FOREIGN KEY (`ID_Usuario`, `ID_Agencia`) REFERENCES `usuarios` (`ID_Usuario`, `ID_Agencia`),
  CONSTRAINT `fk_registro_vehiculos_incidente` FOREIGN KEY (`ID_incidente`) REFERENCES `incidentes` (`ID_incidente`),
  CONSTRAINT `FK_Vehiculos_RolesVehiculo` FOREIGN KEY (`ID_RolV`) REFERENCES `rolesvehiculo` (`ID_RolVehiculo`),
  CONSTRAINT `FK_Vehiculos_TipoVehiculo` FOREIGN KEY (`ID_TipoVehi`) REFERENCES `tipovehiculo` (`ID_TipoVehi`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `vehiculos`
--

LOCK TABLES `vehiculos` WRITE;
/*!40000 ALTER TABLE `vehiculos` DISABLE KEYS */;
/*!40000 ALTER TABLE `vehiculos` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-07 12:17:51
