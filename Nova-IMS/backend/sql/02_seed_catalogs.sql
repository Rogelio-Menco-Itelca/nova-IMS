-- =====================================================================
-- gestionincidentes — extraído de Dump20260607.sql
-- Nova-IMS backend
-- =====================================================================

CREATE DATABASE IF NOT EXISTS gestionincidentes
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_0900_ai_ci;

USE gestionincidentes;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;
SET UNIQUE_CHECKS = 0;
-- ---- agencias ----
--
-- Dumping data for table `agencias`
--

LOCK TABLES `agencias` WRITE;
/*!40000 ALTER TABLE `agencias` DISABLE KEYS */;
INSERT INTO `agencias` VALUES ('CRU','CRUE','Centro Regulador de Urgencias y Emergencias en Salud - CRUE','2026-05-29 10:06:42'),('CSJ','Consejo Superior De La Judicatura','Órgano colombiano de administración y gobierno de la Rama Judicial de Colombia','2026-06-03 12:10:03'),('POL','Policia','Policia Nacional de colombia','2026-05-29 10:06:42');
/*!40000 ALTER TABLE `agencias` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- contador_incidente_visible ----
--
-- Dumping data for table `contador_incidente_visible`
--

LOCK TABLES `contador_incidente_visible` WRITE;
/*!40000 ALTER TABLE `contador_incidente_visible` DISABLE KEYS */;
INSERT INTO `contador_incidente_visible` VALUES (2025,1),(2026,5);
/*!40000 ALTER TABLE `contador_incidente_visible` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- correosincidentes ----
--
-- Dumping data for table `correosincidentes`
--

LOCK TABLES `correosincidentes` WRITE;
/*!40000 ALTER TABLE `correosincidentes` DISABLE KEYS */;
INSERT INTO `correosincidentes` VALUES ('alexandra.higuera@itelca.com.co','csj','2026-06-04 15:57:39'),('alexandra.higuera@itelca.com.co','pol','2026-06-04 15:57:50'),('dilan.novoa@itelca.com.co','csj','2026-06-04 15:57:39'),('dilan.novoa@itelca.com.co','pol','2026-06-04 15:57:50'),('juan.perez@example.com','csj','2026-06-04 15:53:30'),('juan.perez@example.com','POL','2026-06-04 15:53:45'),('rogelio.menco@itelca.com.co','csj','2026-06-04 15:57:39'),('rogelio.menco@itelca.com.co','pol','2026-06-04 15:57:50'),('rogeliomenco4@gmail.com','csj','2026-06-04 15:57:39'),('rogeliomenco4@gmail.com','pol','2026-06-04 15:57:50');
/*!40000 ALTER TABLE `correosincidentes` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- estadosincidentes ----
--
-- Dumping data for table `estadosincidentes`
--

LOCK TABLES `estadosincidentes` WRITE;
/*!40000 ALTER TABLE `estadosincidentes` DISABLE KEYS */;
INSERT INTO `estadosincidentes` VALUES (1,'POL','Abierto','Incidente recién creado','2026-05-29 10:06:43'),(2,'POL','En espera','Incidente esperando asignación','2026-05-29 10:06:43'),(3,'POL','Asignado','Incidente asignado a una patrulla','2026-05-29 10:06:43'),(4,'POL','En proceso','Incidente en atención activa','2026-05-29 10:06:43'),(5,'POL','Cerrado','Incidente finalizado y resuelto','2026-05-29 10:06:43'),(6,'POL','Cancelado','Incidente cancelado sin resolver','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `estadosincidentes` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- eventos ----
--
-- Dumping data for table `eventos`
--

LOCK TABLES `eventos` WRITE;
/*!40000 ALTER TABLE `eventos` DISABLE KEYS */;
INSERT INTO `eventos` VALUES (1,'POL','Disparos','911','2026-05-29 10:06:43',1),(2,'POL','Accidente de tránsito','Accidente','2026-05-29 10:06:43',1),(3,'CSJ','Amenaza contra juez o magistrado','Amenaza','2026-06-07 11:50:38',1),(4,'CSJ','Seguimiento o vigilancia a funcionario judicial','Vigilancia','2026-06-07 11:50:38',1),(5,'CSJ','Atentado o agresión física a funcionario judicial','Agresión','2026-06-07 11:50:38',1),(6,'CSJ','Extorsión a funcionario judicial','Extorsión','2026-06-07 11:50:38',1),(7,'CSJ','Acceso no autorizado a despacho judicial','Acceso indebido','2026-06-07 11:50:38',1),(8,'CSJ','Artefacto explosivo o sospechoso en sede','Explosivo','2026-06-07 11:50:38',1),(9,'CSJ','Vandalismo en instalaciones judiciales','Vandalismo','2026-06-07 11:50:38',2),(10,'CSJ','Incendio o emergencia en sede judicial','Emergencia','2026-06-07 11:50:38',1),(11,'CSJ','Hurto o destrucción de expedientes judiciales','Hurto','2026-06-07 11:50:38',1),(12,'CSJ','Interceptación de comunicaciones judiciales','Interceptación','2026-06-07 11:50:38',1),(13,'CSJ','Suplantación de funcionario judicial','Fraude','2026-06-07 11:50:38',1),(14,'CSJ','Fuga de información reservada','Fuga de información','2026-06-07 11:50:38',1),(15,'CSJ','Disturbio en audiencia pública','Disturbio','2026-06-07 11:50:38',2),(16,'CSJ','Ingreso de armas a sala de audiencias','Armas','2026-06-07 11:50:38',1),(17,'CSJ','Agresión entre partes procesales','Agresión entre partes','2026-06-07 11:50:38',2),(18,'CSJ','Desacato con alteración del orden','Desacato','2026-06-07 11:50:38',2),(19,'CSJ','Amenaza a testigos o víctimas','Amenaza a testigos','2026-06-07 11:50:38',1),(20,'CSJ','Coacción a jurado o perito','Coacción','2026-06-07 11:50:38',1),(21,'CSJ','Presión indebida sobre decisiones judiciales','Presión judicial','2026-06-07 11:50:38',1);
/*!40000 ALTER TABLE `eventos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- genero ----
--
-- Dumping data for table `genero`
--

LOCK TABLES `genero` WRITE;
/*!40000 ALTER TABLE `genero` DISABLE KEYS */;
INSERT INTO `genero` VALUES (1,'Femenino','2026-06-04 15:37:45','csj'),(2,'Masculino','2026-06-04 15:37:45','csj'),(3,'No Binario','2026-06-04 15:37:45','csj'),(4,'Trans','2026-06-04 15:37:45','csj'),(5,'No Se Identifica','2026-06-04 15:37:45','csj'),(6,'Femenino','2026-06-04 15:38:23','pol'),(7,'Masculino','2026-06-04 15:38:23','pol'),(8,'No Binario','2026-06-04 15:38:23','pol'),(9,'Trans','2026-06-04 15:38:23','pol'),(10,'No Se Identifica','2026-06-04 15:38:23','pol');
/*!40000 ALTER TABLE `genero` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- modules ----
--
-- Dumping data for table `modules`
--

LOCK TABLES `modules` WRITE;
/*!40000 ALTER TABLE `modules` DISABLE KEYS */;
INSERT INTO `modules` VALUES (4,'Administración'),(1,'Dashboard'),(2,'Incidentes'),(3,'Reportes');
/*!40000 ALTER TABLE `modules` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- origen ----
--
-- Dumping data for table `origen`
--

LOCK TABLES `origen` WRITE;
/*!40000 ALTER TABLE `origen` DISABLE KEYS */;
INSERT INTO `origen` VALUES (1,'Llamada 123','Llamada de emergencia al 123','POL','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `origen` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- pasosprotocolo ----
--
-- Dumping data for table `pasosprotocolo`
--

LOCK TABLES `pasosprotocolo` WRITE;
/*!40000 ALTER TABLE `pasosprotocolo` DISABLE KEYS */;
INSERT INTO `pasosprotocolo` VALUES (1,1,1,'Verificar lesionados y neutralizar tirador','2026-05-29 10:06:43'),(2,1,2,'Acordonar el área','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `pasosprotocolo` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- permisos ----
--
-- Dumping data for table `permisos`
--

LOCK TABLES `permisos` WRITE;
/*!40000 ALTER TABLE `permisos` DISABLE KEYS */;
INSERT INTO `permisos` VALUES (1,'VER_INCIDENTES','Permiso para visualizar incidentes','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `permisos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- permisos_de_rol ----
--
-- Dumping data for table `permisos_de_rol`
--

LOCK TABLES `permisos_de_rol` WRITE;
/*!40000 ALTER TABLE `permisos_de_rol` DISABLE KEYS */;
INSERT INTO `permisos_de_rol` VALUES (1,'RP-1','csj',1,1,1,1,1,1),(2,'RP-1','csj',2,1,1,1,1,1),(3,'RP-1','csj',3,1,1,1,1,1),(4,'RP-1','csj',4,1,1,1,1,1),(5,'RP-2','csj',1,1,1,1,1,0),(6,'RP-2','csj',2,1,1,1,1,0),(7,'RP-2','csj',3,1,1,0,0,0),(8,'RP-2','csj',4,0,0,0,0,0),(9,'RP-3','csj',1,1,1,0,0,0),(10,'RP-3','csj',2,1,1,1,1,0),(11,'RP-3','csj',3,0,0,0,0,0),(12,'RP-3','csj',4,0,0,0,0,0),(13,'RP-4','csj',1,1,1,0,0,0),(14,'RP-4','csj',2,1,1,0,1,0),(15,'RP-4','csj',3,0,0,0,0,0),(16,'RP-4','csj',4,0,0,0,0,0),(17,'RP-5','csj',1,1,1,0,0,0),(18,'RP-5','csj',2,1,1,0,0,0),(19,'RP-5','csj',3,1,1,0,0,0),(20,'RP-5','csj',4,0,0,0,0,0),(21,'RP-6','csj',1,1,1,0,0,0),(22,'RP-6','csj',2,1,1,0,0,0),(23,'RP-6','csj',3,1,1,0,0,0),(24,'RP-6','csj',4,0,0,0,0,0),(49,'RP-8','pol',1,1,1,1,1,1),(50,'RP-8','pol',2,1,1,1,1,1),(51,'RP-8','pol',3,1,1,1,1,1),(52,'RP-8','pol',4,1,1,1,1,1),(53,'RP-9','pol',1,1,1,1,1,0),(54,'RP-9','pol',2,1,1,1,1,0),(55,'RP-9','pol',3,1,1,0,0,0),(56,'RP-9','pol',4,0,0,0,0,0),(57,'RP-10','pol',1,1,1,0,0,0),(58,'RP-10','pol',2,1,1,1,1,0),(59,'RP-10','pol',3,0,0,0,0,0),(60,'RP-10','pol',4,0,0,0,0,0),(61,'RP-11','pol',1,1,1,0,0,0),(62,'RP-11','pol',2,1,1,0,1,0),(63,'RP-11','pol',3,0,0,0,0,0),(64,'RP-11','pol',4,0,0,0,0,0),(65,'RP-12','pol',1,1,1,0,0,0),(66,'RP-12','pol',2,1,1,0,0,0),(67,'RP-12','pol',3,1,1,0,0,0),(68,'RP-12','pol',4,0,0,0,0,0),(69,'RP-13','pol',1,1,1,0,0,0),(70,'RP-13','pol',2,1,1,0,0,0),(71,'RP-13','pol',3,1,1,0,0,0),(72,'RP-13','pol',4,0,0,0,0,0);
/*!40000 ALTER TABLE `permisos_de_rol` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- prioridades ----
--
-- Dumping data for table `prioridades`
--

LOCK TABLES `prioridades` WRITE;
/*!40000 ALTER TABLE `prioridades` DISABLE KEYS */;
INSERT INTO `prioridades` VALUES (1,'Alta','Requiere atención inmediata - responder en menos de 15 minutos','2026-05-29 10:06:43'),(2,'Media','Puede esperar breve tiempo - responder en menos de 1 hora','2026-05-29 10:06:43'),(3,'Baja','No es urgente - responder en menos de 24 horas','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `prioridades` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- protocolos ----
--
-- Dumping data for table `protocolos`
--

LOCK TABLES `protocolos` WRITE;
/*!40000 ALTER TABLE `protocolos` DISABLE KEYS */;
INSERT INTO `protocolos` VALUES (1,'PROT_911',1,'POL','Protocolo para atención de disparon','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `protocolos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- riesgos ----
--
-- Dumping data for table `riesgos`
--

LOCK TABLES `riesgos` WRITE;
/*!40000 ALTER TABLE `riesgos` DISABLE KEYS */;
INSERT INTO `riesgos` VALUES (1,'Ordinario','Riesgo de nivel ordinario según clasificación institucional','CSJ','2026-06-05 15:16:41'),(2,'Extraordinario','Riesgo de nivel extraordinario que requiere atención especial','CSJ','2026-06-05 15:16:41'),(3,'Ordinario','Riesgo de nivel ordinario según clasificación policial','POL','2026-06-05 15:16:41'),(4,'Extraordinario','Riesgo de nivel extraordinario que requiere intervención prioritaria','POL','2026-06-05 15:16:41');
/*!40000 ALTER TABLE `riesgos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- roles ----
--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('RP-1','Administrador del sistema','csj','Control total del sistema','2026-06-04 16:49:15'),('RP-10','Operador / Despachador','pol','Crea y actualiza incidentes','2026-06-04 16:49:15'),('RP-11','Unidad / Agente de campo','pol','Atiende y actualiza en terreno','2026-06-04 16:49:15'),('RP-12','Analista / Informes','pol','Consulta reportes e indicadores','2026-06-04 16:49:15'),('RP-13','Usuario Consulta','pol','Solo lectura','2026-06-04 16:49:15'),('RP-2','Supervisor / Coordinador','csj','Gestiona equipos y aprueba cambios','2026-06-04 16:49:15'),('RP-3','Operador / Despachador','csj','Crea y actualiza incidentes','2026-06-04 16:49:15'),('RP-4','Unidad / Agente de campo','csj','Atiende y actualiza en terreno','2026-06-04 16:49:15'),('RP-5','Analista / Informes','csj','Consulta reportes e indicadores','2026-06-04 16:49:15'),('RP-6','Usuario Consulta','csj','Solo lectura','2026-06-04 16:49:15'),('RP-8','Administrador del sistema','pol','Control total del sistema','2026-06-04 16:49:15'),('RP-9','Supervisor / Coordinador','pol','Gestiona equipos y aprueba cambios','2026-06-04 16:49:15');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- roles_lugar ----
--
-- Dumping data for table `roles_lugar`
--

LOCK TABLES `roles_lugar` WRITE;
/*!40000 ALTER TABLE `roles_lugar` DISABLE KEYS */;
INSERT INTO `roles_lugar` VALUES (1,'Vivienda_Particular','Casa o apartamento de una persona natural','CSJ'),(2,'Casa_Magistrado','Residencia particular de un magistrado','CSJ'),(3,'Hotel','Establecimiento de hospedaje','CSJ'),(4,'Oficina_Privada','Oficina de empresa privada','CSJ'),(5,'Via_Publica','Calle, carrera, avenida o vía pública','CSJ'),(6,'Sede_Judicial','Palacio de justicia, juzgado o tribunal','CSJ'),(7,'Vehiculo_Particular','Automóvil particular como lugar del incidente','CSJ'),(8,'Restaurante','Establecimiento de comidas','CSJ'),(9,'Centro_Comercial','Centro comercial','CSJ'),(10,'Banco','Entidad financiera','CSJ');
/*!40000 ALTER TABLE `roles_lugar` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- rolesvehiculo ----
--
-- Dumping data for table `rolesvehiculo`
--

LOCK TABLES `rolesvehiculo` WRITE;
/*!40000 ALTER TABLE `rolesvehiculo` DISABLE KEYS */;
INSERT INTO `rolesvehiculo` VALUES (1,'Implicado','Vehículo involucrado en el incidente','POL','2026-05-29 10:06:43'),(2,'Afectado','Vehículo con daños','POL','2026-05-29 10:06:43'),(3,'Testigo','Vehículo que presencia el incidente','POL','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `rolesvehiculo` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- rolpersonas ----
--
-- Dumping data for table `rolpersonas`
--

LOCK TABLES `rolpersonas` WRITE;
/*!40000 ALTER TABLE `rolpersonas` DISABLE KEYS */;
INSERT INTO `rolpersonas` VALUES (1,'Ordinario','Rol ordinario para personas según clasificación institucional','CSJ','2026-06-05 12:22:05'),(2,'Extraordinario','Rol extraordinario que requiere atención especial','CSJ','2026-06-05 12:22:05'),(3,'Ordinario','Rol ordinario para personas según clasificación institucional','POL','2026-06-05 12:23:10'),(4,'Extraordinario','Rol extraordinario que requiere atención especial','POL','2026-06-05 12:23:10');
/*!40000 ALTER TABLE `rolpersonas` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- tipodocumentos ----
--
-- Dumping data for table `tipodocumentos`
--

LOCK TABLES `tipodocumentos` WRITE;
/*!40000 ALTER TABLE `tipodocumentos` DISABLE KEYS */;
INSERT INTO `tipodocumentos` VALUES ('CC','Cédula de ciudadanía','2026-05-29 10:06:43'),('CE','Cédula de extranjería','2026-05-29 10:06:43'),('NIT','Número de identificación tributaria','2026-05-29 10:06:43'),('PA','Pasaporte','2026-05-29 10:06:43'),('TI','Tarjeta de identidad','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `tipodocumentos` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- tipovehiculo ----
--
-- Dumping data for table `tipovehiculo`
--

LOCK TABLES `tipovehiculo` WRITE;
/*!40000 ALTER TABLE `tipovehiculo` DISABLE KEYS */;
INSERT INTO `tipovehiculo` VALUES (1,'Automóvil','Vehículo particular de 4 ruedas','POL','2026-05-29 10:06:43'),(2,'Motocicleta','Motocicleta o ciclomotor de 2 ruedas','POL','2026-05-29 10:06:43'),(3,'Camión','Vehículo de carga pesada','POL','2026-05-29 10:06:43'),(4,'Bicicleta','Vehículo de tracción humana','POL','2026-05-29 10:06:43'),(5,'Bus','Transporte público de pasajeros','POL','2026-05-29 10:06:43');
/*!40000 ALTER TABLE `tipovehiculo` ENABLE KEYS */;
UNLOCK TABLES;

-- ---- usuarios ----
--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES ('MCHAPARRO','miguel','david','chaparro','menco','RP-2','CSJ','rogeliomenco4@gmail.com','3026172447','2026-06-06 21:17:48','INGchaparro04#+','Activo','OK'),('rbenavides','Rogelio','Andrés','Menco','Benavides','RP-1','CSJ','rogelio.menco@itelca.com.co','3026172447','2026-05-29 10:06:43','INGbenavides04#+','Activo','');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
SET FOREIGN_KEY_CHECKS = 1;
SET UNIQUE_CHECKS = 1;
