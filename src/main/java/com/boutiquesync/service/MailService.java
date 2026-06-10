package com.boutiquesync.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.thymeleaf.TemplateEngine;
import org.thymeleaf.context.Context;

/**
 * Service d'envoi d'emails.
 * Utilise Thymeleaf pour les templates HTML et JavaMailSender pour l'envoi.
 * Les envois sont asynchrones pour ne pas bloquer la requête HTTP.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class MailService {

    private final JavaMailSender mailSender;
    private final TemplateEngine templateEngine;

    // MailService.java
    @Value("${boutiquesync.mail.from}")
    private String fromAddress;

    @Value("${boutiquesync.mail.from-name}")
    private String fromName;

    /**
     * Envoie un email d'invitation à un employé.
     * L'envoi est asynchrone : la requête admin ne attend pas la fin de l'envoi.
     *
     * @param to             Email du destinataire
     * @param invitationLink Lien complet avec token
     * @param expiryHours    Durée de validité du lien (affichée dans l'email)
     */
    @Async
    public void sendInvitationEmail(String to, String invitationLink, int expiryHours) {
        try {
            // Variables injectées dans le template Thymeleaf
            Context context = new Context();
            context.setVariable("invitationLink", invitationLink);
            context.setVariable("expiryHours", expiryHours);

            // Rendu du template HTML
            String htmlContent = templateEngine.process("email/invitation", context);

            // Construction du MimeMessage (supporte HTML + encodage UTF-8)
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    "UTF-8"
            );

            helper.setFrom(fromAddress, fromName);
            helper.setTo(to);
            helper.setSubject("Invitation à rejoindre BoutiqueSync");
            helper.setText(htmlContent, true); // true = HTML activé

            mailSender.send(message);

            log.info("Email d'invitation envoyé à {}", to);

        } catch (MailException e) {
            // Erreur SMTP (serveur indisponible, quota dépassé…)
            log.error("Échec envoi email à {} : erreur SMTP — {}", to, e.getMessage());
            throw new RuntimeException("Impossible d'envoyer l'email d'invitation", e);

        } catch (MessagingException e) {
            // Erreur de construction du message (encodage, adresse malformée…)
            log.error("Échec construction email pour {} : {}", to, e.getMessage());
            throw new RuntimeException("Erreur lors de la construction de l'email", e);

        } catch (Exception e) {
            log.error("Erreur inattendue lors de l'envoi email à {} : {}", to, e.getMessage());
            throw new RuntimeException("Erreur inattendue lors de l'envoi de l'email", e);
        }
    }
}